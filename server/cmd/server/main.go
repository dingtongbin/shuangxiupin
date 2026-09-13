package main

import (
	"context"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/shuangxiupin/server/internal/config"
	"github.com/shuangxiupin/server/internal/database"
	"github.com/shuangxiupin/server/internal/handler"
	"github.com/shuangxiupin/server/internal/logger"
	"github.com/shuangxiupin/server/internal/mailer"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/router"
	"github.com/shuangxiupin/server/internal/service"
	"github.com/shuangxiupin/server/internal/session"
	"github.com/shuangxiupin/server/internal/storage"
	"github.com/shuangxiupin/server/internal/verify"
	"github.com/shuangxiupin/server/internal/ws"
)

func main() {
	cfgPath := flag.String("config", "configs/config.yaml", "配置文件路径")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		slog.Error("加载配置失败", "err", err)
		os.Exit(1)
	}
	logger.Setup(cfg.Log.Level, cfg.Log.Format)

	db, err := database.OpenMySQL(cfg.MySQL.DSN)
	if err != nil {
		slog.Error("连接 MySQL 失败", "err", err)
		os.Exit(1)
	}
	if err := database.Migrate(db); err != nil {
		slog.Error("数据库迁移失败", "err", err)
		os.Exit(1)
	}
	if err := database.Seed(db, cfg); err != nil {
		slog.Error("内置数据初始化失败", "err", err)
		os.Exit(1)
	}

	rdb, err := database.OpenRedis(cfg.Redis)
	if err != nil {
		slog.Error("连接 Redis 失败", "err", err)
		os.Exit(1)
	}
	service.NewRbac(db, rdb).InvalidateAllPerms(context.Background()) // 权限点种子变更后失效全部权限缓存

	sm := session.New(rdb, cfg.Session.Name, cfg.Session.TTLHours, cfg.Session.Secure, cfg.Session.Domain)
	hub := ws.NewHub(rdb)
	rbac := service.NewRbac(db, rdb)

	// 系统参数：yaml 邮件配置作为兜底默认，DB/管理端可覆盖
	settingsBase := map[string]string{
		model.SettingMailEnabled:  strconv.FormatBool(cfg.Mail.Enabled),
		model.SettingMailHost:     cfg.Mail.Host,
		model.SettingMailPort:     strconv.Itoa(cfg.Mail.Port),
		model.SettingMailUsername: cfg.Mail.Username,
		model.SettingMailPassword: cfg.Mail.Password,
		model.SettingMailFrom:     cfg.Mail.From,
		model.SettingMailSSL:      strconv.FormatBool(cfg.Mail.SSL),
		model.SettingMailNotifyTo: cfg.Mail.NotifyTo,
	}
	settings := service.NewSettings(db, rdb, settingsBase)
	mail := mailer.NewFromProvider(settings)
	vc := verify.New(db, rdb, mail, settings)

	var store storage.Store
	switch cfg.Storage.Driver {
	case "minio":
		store, err = storage.NewMinio(storage.MinioConfig{
			Endpoint: cfg.Storage.MinIO.Endpoint, AccessKey: cfg.Storage.MinIO.AccessKey,
			SecretKey: cfg.Storage.MinIO.SecretKey, Bucket: cfg.Storage.MinIO.Bucket,
			UseSSL: cfg.Storage.MinIO.UseSSL, PublicBase: cfg.Storage.MinIO.PublicBase,
		})
		if err != nil {
			slog.Error("初始化 MinIO 存储失败", "err", err)
			os.Exit(1)
		}
	default:
		store = storage.NewLocal(cfg.Storage.LocalDir, cfg.Storage.LocalURLPrefix)
	}

	h := handler.New(cfg, db, sm, vc, mail, hub, rbac, store, settings)
	r := router.New(h, sm, cfg, rbac)

	srv := &http.Server{Addr: cfg.Server.Addr, Handler: r}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP 服务异常退出", "err", err)
			os.Exit(1)
		}
	}()
	slog.Info("双休聘服务已启动", "addr", cfg.Server.Addr, "mode", cfg.Server.Mode)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("正在优雅停机...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("停机超时", "err", err)
	}
	slog.Info("双休聘服务已退出")
}
