// Package service — 系统参数：DB 存储 + Redis 缓存（60s TTL，更新即失效）。
// 主服务与管理服务共享 Redis，参数修改对两个进程即时可见。
package service

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/config"
	"github.com/shuangxiupin/server/internal/model"
)

const settingsCacheKey = "sxu:sys:configs"

type SettingsService struct {
	db   *gorm.DB
	rdb  *redis.Client
	base map[string]string // yaml 兜底值（DB 未覆盖时生效）
}

func NewSettings(db *gorm.DB, rdb *redis.Client, base map[string]string) *SettingsService {
	if base == nil {
		base = map[string]string{}
	}
	return &SettingsService{db: db, rdb: rdb, base: base}
}

// All 全部参数（含默认值兜底），Redis 缓存优先。
func (s *SettingsService) All(ctx context.Context) map[string]string {
	if raw, err := s.rdb.Get(ctx, settingsCacheKey).Result(); err == nil {
		var m map[string]string
		if json.Unmarshal([]byte(raw), &m) == nil {
			return m
		}
	}
	m := make(map[string]string)
	for _, d := range model.SystemSettingDefs() {
		m[d.Key] = d.Default
	}
	for k, v := range s.base { // yaml 兜底
		if _, ok := model.SettingDefByKey(k); ok {
			m[k] = v
		}
	}
	var rows []model.SystemSetting
	if err := s.db.Find(&rows).Error; err == nil {
		for _, r := range rows {
			if _, ok := model.SettingDefByKey(r.Key); ok {
				m[r.Key] = r.Value
			}
		}
	}
	if b, err := json.Marshal(m); err == nil {
		s.rdb.Set(ctx, settingsCacheKey, string(b), 60*time.Second)
	}
	return m
}

func (s *SettingsService) GetBool(ctx context.Context, key string, def bool) bool {
	defs, _ := model.SettingDefByKey(key)
	v, ok := s.All(ctx)[key]
	if !ok {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		b2, _ := strconv.ParseBool(defs.Default)
		return b2
	}
	return b
}

func (s *SettingsService) GetInt(ctx context.Context, key string, def int) int {
	defs, _ := model.SettingDefByKey(key)
	v, ok := s.All(ctx)[key]
	if !ok {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		n2, _ := strconv.Atoi(defs.Default)
		return n2
	}
	return n
}

// Describe 管理端视图：定义 + 当前值。
func (s *SettingsService) Describe(ctx context.Context) []map[string]any {
	m := s.All(ctx)
	defs := model.SystemSettingDefs()
	sort.Slice(defs, func(i, j int) bool { return defs[i].Key < defs[j].Key })
	out := make([]map[string]any, 0, len(defs))
	for _, d := range defs {
		value := m[d.Key]
		if d.Type == "secret" && value != "" {
			value = "******"
		}
		out = append(out, map[string]any{
			"key": d.Key, "name": d.Name, "remark": d.Remark,
			"type": d.Type, "default": d.Default, "value": value,
			"placeholder": d.Placeholder,
		})
	}
	return out
}

// MailSettings 当前邮件配置（yaml 兜底 + DB 覆写），供 Mailer 每次发送时动态读取。
func (s *SettingsService) MailSettings() config.Mail {
	m := s.All(context.Background())
	port, _ := strconv.Atoi(m[model.SettingMailPort])
	if port <= 0 {
		port = 465
	}
	enabled, _ := strconv.ParseBool(m[model.SettingMailEnabled])
	ssl, _ := strconv.ParseBool(m[model.SettingMailSSL])
	return config.Mail{
		Enabled:  enabled,
		Host:     m[model.SettingMailHost],
		Port:     port,
		Username: m[model.SettingMailUsername],
		Password: m[model.SettingMailPassword],
		From:     m[model.SettingMailFrom],
		SSL:      ssl,
		NotifyTo: m[model.SettingMailNotifyTo],
	}
}

// Update 校验并保存；保存后失效缓存（两个进程共用 Redis，即时生效）。
func (s *SettingsService) Update(ctx context.Context, values map[string]string) error {
	for k, v := range values {
		def, ok := model.SettingDefByKey(k)
		if !ok {
			return apperr.BadRequest.Withf("未知的系统参数：%s", k)
		}
		switch def.Type {
		case "bool":
			if _, err := strconv.ParseBool(v); err != nil {
				return apperr.BadRequest.Withf("参数 %s 需为 true/false", k)
			}
		case "secret":
			if v == "" || v == "******" {
				continue // 保持原值不覆盖
			}
			if len(v) > 500 {
				return apperr.BadRequest.Withf("参数 %s 过长", k)
			}
		case "string":
			if len(v) > 500 {
				return apperr.BadRequest.Withf("参数 %s 过长", k)
			}
		case "int":
			n, err := strconv.Atoi(v)
			if err != nil {
				return apperr.BadRequest.Withf("参数 %s 需为整数", k)
			}
			switch k {
			case model.SettingVerifyExpireMin:
				if n < 1 || n > 60 {
					return apperr.BadRequest.With("验证码有效期需在 1-60 分钟之间")
				}
			case model.SettingVerifyIntervalSec:
				if n < 10 || n > 3600 {
					return apperr.BadRequest.With("发送间隔需在 10-3600 秒之间")
				}
			case model.SettingVerifyMaxAttempts:
				if n < 1 || n > 20 {
					return apperr.BadRequest.With("最大错误次数需在 1-20 之间")
				}
			case model.SettingVerifyDailyLimit:
				if n < 1 || n > 1000 {
					return apperr.BadRequest.With("每日上限需在 1-1000 之间")
				}
			}
		}
	}
	for k, v := range values {
		if _, ok := model.SettingDefByKey(k); !ok {
			continue
		}
		var row model.SystemSetting
		if err := s.db.Where("`key` = ?", k).First(&row).Error; err != nil {
			if err := s.db.Create(&model.SystemSetting{Key: k, Value: v}).Error; err != nil {
				return err
			}
		} else if err := s.db.Model(&row).Update("value", v).Error; err != nil {
			return err
		}
	}
	s.rdb.Del(ctx, settingsCacheKey)
	return nil
}
