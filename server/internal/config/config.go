package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Server struct {
	Addr           string `yaml:"addr"`
	Mode           string `yaml:"mode"`             // debug | release
	StaticDir      string `yaml:"static_dir"`       // 移动端 H5 产物
	AdminStaticDir string `yaml:"admin_static_dir"` // 系统管理 PC 控制台产物（/console 托管）
	// 受信代理 CIDR 列表；留空表示不信任任何代理（ClientIP=直连地址），
	// 保证 /api/sys 内网限制不被 X-Forwarded-For 伪造。
	TrustedProxies []string `yaml:"trusted_proxies"`
}

type MySQL struct {
	DSN string `yaml:"dsn"`
}

type Redis struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type Session struct {
	Name     string `yaml:"name"`
	TTLHours int    `yaml:"ttl_hours"`
	Secure   bool   `yaml:"secure"`
	Domain   string `yaml:"domain"`
}

type Mail struct {
	Enabled  bool   `yaml:"enabled"`
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	From     string `yaml:"from"`
	SSL      bool   `yaml:"ssl"` // true: 465 隐式 SSL；false: STARTTLS(587)
	NotifyTo string `yaml:"notify_to"`
}

type Storage struct {
	Driver         string         `yaml:"driver"` // local | minio
	LocalDir       string         `yaml:"local_dir"`
	LocalURLPrefix string         `yaml:"local_url_prefix"`
	MaxMB          int            `yaml:"max_mb"`
	MinIO          MinioConfigYml `yaml:"minio"`
}

type MinioConfigYml struct {
	Endpoint   string `yaml:"endpoint"`
	AccessKey  string `yaml:"access_key"`
	SecretKey  string `yaml:"secret_key"`
	Bucket     string `yaml:"bucket"`
	UseSSL     bool   `yaml:"use_ssl"`
	PublicBase string `yaml:"public_base"`
}

type Search struct {
	Driver string `yaml:"driver"` // db（默认，SQL LIKE）；预留 meilisearch 等驱动切换单点
}

type Log struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
}

type Seed struct {
	AdminEmail    string `yaml:"admin_email"`
	AdminPassword string `yaml:"admin_password"`
}

type CORS struct {
	Origins []string `yaml:"origins"`
}

type Config struct {
	Server  Server  `yaml:"server"`
	MySQL   MySQL   `yaml:"mysql"`
	Redis   Redis   `yaml:"redis"`
	Session Session `yaml:"session"`
	Mail    Mail    `yaml:"mail"`
	Storage Storage `yaml:"storage"`
	Search  Search  `yaml:"search"`
	Log     Log     `yaml:"log"`
	Seed    Seed    `yaml:"seed"`
	CORS    CORS    `yaml:"cors"`
}

func defaults() *Config {
	return &Config{
		Server:  Server{Addr: ":8080", Mode: "debug", StaticDir: "../web/dist", AdminStaticDir: "../admin/dist"},
		MySQL:   MySQL{DSN: "sxu:sxu_dev_2026@tcp(127.0.0.1:3306)/shuangxiupin?charset=utf8mb4&parseTime=True&loc=Local"},
		Redis:   Redis{Addr: "127.0.0.1:6379", DB: 0},
		Session: Session{Name: "sxu_session", TTLHours: 168},
		Mail:    Mail{Port: 465, SSL: true},
		Storage: Storage{Driver: "local", LocalDir: "./data/uploads", LocalURLPrefix: "/uploads", MaxMB: 5},
		Search:  Search{Driver: "db"},
		Log:     Log{Level: "info", Format: "text"},
		Seed:    Seed{AdminEmail: "admin@shuangxiupin.cn", AdminPassword: "Sxu@2026!"},
	}
}

// Load 读取 yaml 配置；环境变量可覆盖关键字段（容器部署用）。
func Load(path string) (*Config, error) {
	cfg := defaults()
	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("解析配置文件失败: %w", err)
		}
	}
	if v := os.Getenv("SXU_SERVER_ADDR"); v != "" {
		cfg.Server.Addr = v
	}
	if v := os.Getenv("SXU_MYSQL_DSN"); v != "" {
		cfg.MySQL.DSN = v
	}
	if v := os.Getenv("SXU_REDIS_ADDR"); v != "" {
		cfg.Redis.Addr = v
	}
	if v := os.Getenv("SXU_REDIS_PASSWORD"); v != "" {
		cfg.Redis.Password = v
	}
	if v := os.Getenv("SXU_REDIS_DB"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.Redis.DB = n
		}
	}
	if v := os.Getenv("SXU_MAIL_NOTIFY_TO"); v != "" {
		cfg.Mail.NotifyTo = v
	}
	return cfg, nil
}
