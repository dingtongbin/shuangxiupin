package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
)

type markReadReq struct {
	IDs []int64 `json:"ids"`
	All bool    `json:"all"`
}

// ListMessages 消息中心：type = system | interact（无私信）。
func (h *Handler) ListMessages(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	box := c.DefaultQuery("type", "interact")
	if box != "system" && box != "interact" {
		return nil, apperr.BadRequest.With("消息类型不合法")
	}
	return h.notify.List(uid, box, toPageQuery(c))
}

func (h *Handler) MarkMessagesRead(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var req markReadReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return nil, h.notify.MarkRead(uid, req.IDs, req.All)
}

func (h *Handler) UnreadCount(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	system, interact, total := h.notify.Unread(uid)
	return gin.H{"system": system, "interact": interact, "total": total}, nil
}
