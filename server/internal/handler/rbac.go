package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 角色与权限管理（权限点 role.manage，/sys 控制台） ----------

func (h *Handler) ListRoles(c *gin.Context) (any, error) {
	return h.rbac.ListRoles()
}

func (h *Handler) ListPermissions(c *gin.Context) (any, error) {
	return h.rbac.ListPermissions()
}

func (h *Handler) CreateRole(c *gin.Context) (any, error) {
	var in service.RoleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.rbac.CreateRole(c.Request.Context(), in)
}

func (h *Handler) UpdateRole(c *gin.Context) (any, error) {
	id := paramID(c)
	if id <= 0 {
		return nil, apperr.NotFound
	}
	var in service.RoleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.rbac.UpdateRole(c.Request.Context(), id, in)
}

func (h *Handler) DeleteRole(c *gin.Context) (any, error) {
	id := paramID(c)
	if id <= 0 {
		return nil, apperr.NotFound
	}
	return nil, h.rbac.DeleteRole(c.Request.Context(), id)
}

// GetUserRoles 用户当前角色 ID 列表。
func (h *Handler) GetUserRoles(c *gin.Context) (any, error) {
	uid := paramID(c)
	if uid <= 0 {
		return nil, apperr.NotFound
	}
	return h.rbac.UserRoles(c.Request.Context(), uid)
}

// SetUserRoles 调整用户角色（多选，整体替换）。
func (h *Handler) SetUserRoles(c *gin.Context) (any, error) {
	uid := paramID(c)
	if uid <= 0 {
		return nil, apperr.NotFound
	}
	var req struct {
		RoleIDs []int64 `json:"role_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	perms, err := h.rbac.SetUserRoles(c.Request.Context(), uid, req.RoleIDs, h.sess)
	if err != nil {
		return nil, err
	}
	return gin.H{"perms": perms}, nil
}
