package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
)

// GetSystemConfigs 系统参数列表（定义 + 当前值）。
func (h *Handler) GetSystemConfigs(c *gin.Context) (any, error) {
	items := h.settings.Describe(c.Request.Context())
	if items == nil {
		items = []map[string]any{}
	}
	return items, nil
}

type updateConfigsReq struct {
	Values map[string]string `json:"values" binding:"required"`
}

type mailTestReq struct {
	To string `json:"to" binding:"required,email"`
}

// MailTest 按当前邮件配置发送测试邮件。
func (h *Handler) MailTest(c *gin.Context) (any, error) {
	var req mailTestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest.With("请填写有效的收件邮箱")
	}
	if !h.settings.MailSettings().Enabled {
		return nil, apperr.BadRequest.With("请先在系统参数中启用邮件发送并保存")
	}
	if err := h.mail.Send(req.To, "【双休聘】SMTP 配置测试邮件",
		"<p>这是一封测试邮件。收到即说明邮件服务器配置正确。</p>"); err != nil {
		return nil, apperr.Server.With("发送失败：" + err.Error())
	}
	return gin.H{"sent": true}, nil
}

// UpdateSystemConfigs 批量更新系统参数。
func (h *Handler) UpdateSystemConfigs(c *gin.Context) (any, error) {
	var req updateConfigsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return nil, h.settings.Update(c.Request.Context(), req.Values)
}
