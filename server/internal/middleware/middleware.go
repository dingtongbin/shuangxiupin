// Package middleware 通用中间件：请求日志、CORS、会话注入、鉴权与守卫。
package middleware

import (
	"context"
	"log/slog"
	"net"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/session"
)

const (
	CtxUID        = "sxu_uid"
	CtxRole       = "sxu_role"
	CtxMustChange = "sxu_mcp"
)

// RequestLog 结构化访问日志。
func RequestLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		slog.Info("http",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"cost_ms", time.Since(start).Milliseconds(),
			"ip", c.ClientIP(),
		)
	}
}

func CORS(origins []string) gin.HandlerFunc {
	allow := make(map[string]struct{}, len(origins))
	for _, o := range origins {
		allow[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allow[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Credentials", "true")
				c.Header("Vary", "Origin")
			}
		}
		if c.Request.Method == "OPTIONS" {
			c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
			c.Header("Access-Control-Max-Age", "86400")
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// Hydrate 全局执行：尝试解析会话并注入上下文（不强制登录）。
func Hydrate(sm *session.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		if d, ok := sm.Get(c); ok {
			c.Set(CtxUID, d.UserID)
			c.Set(CtxRole, d.Role)
			c.Set(CtxMustChange, d.MustChangePWD)
		}
		c.Next()
	}
}

func UID(c *gin.Context) int64 {
	if v, ok := c.Get(CtxUID); ok {
		if id, ok := v.(int64); ok {
			return id
		}
	}
	return 0
}

func Role(c *gin.Context) int {
	if v, ok := c.Get(CtxRole); ok {
		if r, ok := v.(int); ok {
			return r
		}
	}
	return 0
}

func MustChangePWD(c *gin.Context) bool {
	if v, ok := c.Get(CtxMustChange); ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return false
}

// RequireLogin 强制登录。
func RequireLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if UID(c) <= 0 {
			httputil.Abort(c, apperr.Unauthorized)
			return
		}
		c.Next()
	}
}

// RequireRoles 强制角色。
func RequireRoles(roles ...int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if UID(c) <= 0 {
			httputil.Abort(c, apperr.Unauthorized)
			return
		}
		r := Role(c)
		for _, want := range roles {
			if r == want {
				c.Next()
				return
			}
		}
		httputil.Abort(c, apperr.Forbidden)
	}
}

// IntranetOnly 仅允许内网/环回地址访问（系统管理员控制台）。
// 注意：需配合 SetTrustedProxies(nil) 使用，否则可能被 X-Forwarded-For 伪造。
func IntranetOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := net.ParseIP(c.ClientIP())
		if ip != nil && (ip.IsLoopback() || ip.IsPrivate()) {
			c.Next()
			return
		}
		httputil.Abort(c, apperr.Forbidden.With("系统管理仅限内网访问"))
	}
}

// PermChecker 权限判断接口（由 RbacService 实现）。
type PermChecker interface {
	HasPerm(ctx context.Context, uid int64, code string) bool
}

// RequirePerm RBAC 权限点守卫。
func RequirePerm(code string, checker PermChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		if UID(c) <= 0 {
			httputil.Abort(c, apperr.Unauthorized)
			return
		}
		if !checker.HasPerm(c.Request.Context(), UID(c), code) {
			httputil.Abort(c, apperr.Forbidden)
			return
		}
		c.Next()
	}
}

// v1 路径下的强制改密白名单（主服务与系统管理控制台共用同一中间件）。
var mcpAllowPaths = map[string]struct{}{
	"/api/v1/auth/password": {},
	"/api/v1/auth/logout":   {},
	"/api/v1/auth/me":       {},
}

// GuardMustChangePwd 强制改密守卫：会话带 must_change_pwd 标记时，
// 仅放行改密/登出/个人信息接口。
func GuardMustChangePwd() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !MustChangePWD(c) {
			c.Next()
			return
		}
		p := c.FullPath()
		if _, ok := mcpAllowPaths[p]; ok {
			c.Next()
			return
		}
		httputil.Abort(c, apperr.MustChangePwd)
	}
}
