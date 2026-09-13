package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/session"
	"github.com/shuangxiupin/server/internal/verify"
)

type sendCodeReq struct {
	Email   string `json:"email" binding:"required"`
	Purpose string `json:"purpose" binding:"required"`
}

// SendCode 发送邮箱验证码（限频在 verify 服务内）。
func (h *Handler) SendCode(c *gin.Context) (any, error) {
	var req sendCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	if req.Purpose != verify.PurposeRegister && req.Purpose != verify.PurposeReset {
		return nil, apperr.BadRequest.With("验证码用途不合法")
	}
	return nil, h.verify.Send(c.Request.Context(), req.Email, req.Purpose)
}

type registerReq struct {
	Email    string `json:"email" binding:"required"`
	Code     string `json:"code" binding:"required"`
	Password string `json:"password" binding:"required"`
	Nickname string `json:"nickname"`
}

func (h *Handler) Register(c *gin.Context) (any, error) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	v, err := h.auth.Register(c.Request.Context(), req.Email, req.Code, req.Password, req.Nickname)
	if err != nil {
		return nil, err
	}
	if err := h.sess.Create(c, session.Data{UserID: v.ID, Role: v.Role, MustChangePWD: v.MustChangePWD}); err != nil {
		return nil, err
	}
	return v, nil
}

type loginReq struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) (any, error) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	v, err := h.auth.Login(req.Email, req.Password)
	if err != nil {
		return nil, err
	}
	if err := h.sess.Create(c, session.Data{UserID: v.ID, Role: v.Role, MustChangePWD: v.MustChangePWD}); err != nil {
		return nil, err
	}
	return v, nil
}

func (h *Handler) Logout(c *gin.Context) (any, error) {
	h.sess.Destroy(c)
	return nil, nil
}

func (h *Handler) Me(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	if uid <= 0 {
		return nil, apperr.Unauthorized
	}
	return h.auth.Me(uid)
}

type changePwdReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

func (h *Handler) ChangePassword(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	if uid <= 0 {
		return nil, apperr.Unauthorized
	}
	var req changePwdReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	if err := h.auth.ChangePassword(uid, req.OldPassword, req.NewPassword); err != nil {
		return nil, err
	}
	// 轮换当前会话（清除强制改密标记，角色/状态以最新为准）
	v, err := h.auth.Me(uid)
	if err != nil {
		return nil, err
	}
	if err := h.sess.Rotate(c, session.Data{UserID: v.ID, Role: v.Role, MustChangePWD: v.MustChangePWD}); err != nil {
		return nil, err
	}
	return nil, nil
}

type resetReq struct {
	Email       string `json:"email" binding:"required"`
	Code        string `json:"code" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

func (h *Handler) Reset(c *gin.Context) (any, error) {
	var req resetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return h.auth.ResetPassword(c.Request.Context(), req.Email, req.Code, req.NewPassword)
}
