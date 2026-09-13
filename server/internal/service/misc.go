package service

import (
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/model"
)

// MiscService 杂项：注册邮箱域名白名单维护（系统管理员）。
type MiscService struct {
	db *gorm.DB
}

func NewMisc(db *gorm.DB) *MiscService { return &MiscService{db: db} }

func (s *MiscService) ListDomains() ([]model.EmailDomain, error) {
	var ds []model.EmailDomain
	if err := s.db.Order("id ASC").Find(&ds).Error; err != nil {
		return nil, err
	}
	return ds, nil
}

func (s *MiscService) AddDomain(domain, remark string) (*model.EmailDomain, error) {
	domain = strings.ToLower(strings.TrimSpace(domain))
	domain = strings.TrimPrefix(domain, "@")
	if domain == "" || !strings.Contains(domain, ".") || strings.ContainsAny(domain, " /\\") {
		return nil, apperr.BadRequest.With("域名格式不正确，如 163.com")
	}
	if len(domain) > 64 {
		return nil, apperr.BadRequest.With("域名过长")
	}
	var cnt int64
	s.db.Model(&model.EmailDomain{}).Where("domain = ?", domain).Count(&cnt)
	if cnt > 0 {
		return nil, apperr.Conflict.With("该域名已存在")
	}
	d := &model.EmailDomain{Domain: domain, Enabled: true, Remark: strings.TrimSpace(remark)}
	if err := s.db.Create(d).Error; err != nil {
		return nil, err
	}
	return d, nil
}

func (s *MiscService) ToggleDomain(id int64) (*model.EmailDomain, error) {
	var d model.EmailDomain
	if err := s.db.First(&d, id).Error; err != nil {
		return nil, apperr.NotFound.With("域名不存在")
	}
	if err := s.db.Model(&d).Update("enabled", !d.Enabled).Error; err != nil {
		return nil, err
	}
	return &d, nil
}
