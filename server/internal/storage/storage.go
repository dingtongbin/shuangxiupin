// Package storage 文件存储抽象：local（本地磁盘，默认）与 minio（S3/MinIO 兼容）。
// 切换只需改配置 storage.driver，上传接口返回的 URL 结构对前端透明。
package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Store interface {
	// Put 保存文件并返回可公开访问的 URL。
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
}

// ---------- 本地磁盘 ----------

type LocalStore struct {
	dir       string
	urlPrefix string
}

func NewLocal(dir, urlPrefix string) *LocalStore {
	if urlPrefix == "" {
		urlPrefix = "/uploads"
	}
	return &LocalStore{dir: dir, urlPrefix: urlPrefix}
}

func (s *LocalStore) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) (string, error) {
	path := filepath.Join(s.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return "", err
	}
	return s.urlPrefix + "/" + key, nil
}

// ---------- MinIO / S3 兼容 ----------

type MinioConfig struct {
	Endpoint   string `yaml:"endpoint"` // 如 127.0.0.1:9000
	AccessKey  string `yaml:"access_key"`
	SecretKey  string `yaml:"secret_key"`
	Bucket     string `yaml:"bucket"`
	UseSSL     bool   `yaml:"use_ssl"`
	PublicBase string `yaml:"public_base"` // 如 https://oss.example.com（含 bucket 访问域名则填它）
}

type MinioStore struct {
	client     *minio.Client
	bucket     string
	publicBase string
}

func NewMinio(cfg MinioConfig) (*MinioStore, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}
	base := cfg.PublicBase
	if base == "" {
		scheme := "http"
		if cfg.UseSSL {
			scheme = "https"
		}
		base = fmt.Sprintf("%s://%s/%s", scheme, cfg.Endpoint, cfg.Bucket)
	}
	return &MinioStore{client: client, bucket: cfg.Bucket, publicBase: base}, nil
}

func (s *MinioStore) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s/%s", s.publicBase, key), nil
}
