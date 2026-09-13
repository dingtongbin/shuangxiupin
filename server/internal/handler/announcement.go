package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
)

type createAnnouncementReq struct {
	Content string `json:"content" binding:"required"`
}

// AdminCreateAnnouncement 发布系统公告（全员可见，无指定用户）。
func (h *Handler) AdminCreateAnnouncement(c *gin.Context) (any, error) {
	adminID := middleware.UID(c)
	var req createAnnouncementReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return h.announcements.Create(adminID, req.Content)
}

// ListAnnouncements 公告列表（全员可见）。
func (h *Handler) ListAnnouncements(c *gin.Context) (any, error) {
	return h.announcements.List(toPageQuery(c))
}
