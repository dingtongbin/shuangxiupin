package service

import (
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

// AnnouncementService 系统公告：管理员发布，全员可见（无指定用户）。
type AnnouncementService struct {
	db *gorm.DB
}

func NewAnnouncement(db *gorm.DB) *AnnouncementService {
	return &AnnouncementService{db: db}
}

func (s *AnnouncementService) Create(adminID int64, content string) (*model.Announcement, error) {
	content = strings.TrimSpace(content)
	if n := len([]rune(content)); n < 1 || n > 500 {
		return nil, apperr.BadRequest.With("公告内容需 1-500 字")
	}
	a := &model.Announcement{Content: content, CreatedBy: adminID}
	if err := s.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}

func (s *AnnouncementService) List(page httputil.PageQuery) (httputil.PageResult[model.Announcement], error) {
	q := s.db.Model(&model.Announcement{})
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[model.Announcement]{}, err
	}
	var items []model.Announcement
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&items).Error; err != nil {
		return httputil.PageResult[model.Announcement]{}, err
	}
	return httputil.PageOf(items, total, page), nil
}
