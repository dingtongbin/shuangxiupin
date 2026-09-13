// Package router 路由装配：公开接口 / 登录接口 / 企业接口 / 管理端接口分层，
// 系统管理员在路由层就不具备任何内容运营入口。
package router

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/config"
	"github.com/shuangxiupin/server/internal/handler"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/service"
	"github.com/shuangxiupin/server/internal/session"
)

func wrap(h func(*gin.Context) (any, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		data, err := h(c)
		if err != nil {
			httputil.Fail(c, err)
			return
		}
		httputil.OK(c, data)
	}
}

func New(h *handler.Handler, sm *session.Manager, cfg *config.Config, rbac *service.RbacService) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	// 不信任任何代理头（ClientIP 取直连地址），保证 IntranetOnly 不被
	// X-Forwarded-For 伪造。部署在可信反代之后时改为配置的受信代理列表。
	if len(cfg.Server.TrustedProxies) > 0 {
		_ = r.SetTrustedProxies(cfg.Server.TrustedProxies)
	} else {
		_ = r.SetTrustedProxies(nil)
	}
	r.MaxMultipartMemory = 8 << 20
	r.Use(gin.Recovery(), middleware.RequestLog(), middleware.CORS(cfg.CORS.Origins), middleware.Hydrate(sm))

	r.Static("/uploads", cfg.Storage.LocalDir)

	// API 版本化：客户端（WebView 壳）上架前锁定接口形状
	api := r.Group("/api/v1")
	api.GET("/health", wrap(func(c *gin.Context) (any, error) {
		return gin.H{"status": "up"}, nil
	}))
	api.Use(middleware.GuardMustChangePwd())

	// ---------- 认证 ----------
	auth := api.Group("/auth")
	auth.POST("/code", wrap(h.SendCode))
	auth.POST("/register", wrap(h.Register))
	auth.POST("/login", wrap(h.Login))
	auth.POST("/logout", wrap(h.Logout))
	auth.POST("/reset", wrap(h.Reset))
	auth.GET("/me", wrap(h.Me))
	authLogin := auth.Group("", middleware.RequireLogin())
	authLogin.POST("/password", wrap(h.ChangePassword))

	// ---------- 公开 ----------
	api.GET("/dicts", wrap(h.Dicts))
	api.GET("/jobs", wrap(h.ListJobs))
	api.GET("/jobs/:id", wrap(h.GetJob))
	api.GET("/companies", wrap(h.ListCompanies))
	api.GET("/companies/:id", wrap(h.GetCompany))
	api.GET("/companies/:id/reviews", wrap(h.ListReviews))
	api.GET("/posts", wrap(h.ListPosts))
	api.GET("/posts/:id", wrap(h.GetPost))
	api.GET("/posts/:id/comments", wrap(h.ListComments))
	api.GET("/comments/:id/replies", wrap(h.ListReplies))
	api.GET("/users/:id", wrap(h.GetUserProfile))
	api.GET("/users/:id/posts", wrap(h.GetUserPosts))
	api.GET("/users/:id/answers", wrap(h.GetUserAnswers))
	api.GET("/follows/:id", wrap(h.GetFollow))
	api.GET("/search/jobs", wrap(h.SearchJobs))
	api.GET("/search/posts", wrap(h.SearchPosts))
	api.GET("/search/companies", wrap(h.SearchCompanies))
	api.GET("/search/users", wrap(h.SearchUsers))
	api.GET("/announcements", wrap(h.ListAnnouncements))

	// ---------- 登录用户 ----------
	user := api.Group("", middleware.RequireLogin())
	user.PUT("/me", wrap(h.UpdateMe))
	user.POST("/upload", wrap(h.Upload))
	user.GET("/me/history", wrap(h.ListHistory))
	user.GET("/me/history/jobs", wrap(h.HistoryJobs))
	user.DELETE("/me/history", wrap(h.ClearHistory))

	// 社区行为仅普通用户/企业招聘用户（管理员不发内容）
	member := api.Group("", middleware.RequireLogin(), middleware.RequireRoles(model.RoleUser, model.RoleEnterprise))
	member.POST("/likes", wrap(h.ToggleLike))
	member.POST("/favorites", wrap(h.ToggleFavorite))
	member.GET("/me/favorites", wrap(h.MyFavorites))
	member.POST("/follows/:id/toggle", wrap(h.ToggleFollow))
	member.POST("/posts", wrap(h.CreatePost))
	member.POST("/posts/:id/comments", wrap(h.CreateComment))
	member.DELETE("/posts/:id", wrap(h.DeletePost))
	member.DELETE("/comments/:id", wrap(h.DeleteComment))
	member.POST("/companies", wrap(h.CreateCompany))
	member.POST("/companies/:id/reviews", wrap(h.CreateReview))

	msg := api.Group("", middleware.RequireLogin())
	msg.GET("/messages", wrap(h.ListMessages))
	msg.POST("/messages/read", wrap(h.MarkMessagesRead))
	msg.GET("/messages/unread", wrap(h.UnreadCount))

	cert := api.Group("/cert-requests", middleware.RequireLogin(), middleware.RequireRoles(model.RoleUser))
	cert.POST("", wrap(h.SubmitCert))
	cert.GET("/my", wrap(h.MyCerts))

	// ---------- 企业招聘用户 ----------
	ent := api.Group("/enterprise", middleware.RequireLogin(), middleware.RequireRoles(model.RoleEnterprise))
	ent.POST("/jobs", wrap(h.CreateJob))
	ent.GET("/jobs", wrap(h.MyJobs))
	ent.PUT("/jobs/:id", wrap(h.UpdateJob))
	ent.POST("/jobs/:id/close", wrap(h.CloseJob))
	ent.POST("/jobs/:id/open", wrap(h.OpenJob))

	// ---------- WebSocket ----------
	api.GET("/ws", h.ServeWS)

	// ---------- 运营管理后台（/admin：仅运营管理员；系统管理员无任何入口） ----------
	adminOps := api.Group("/admin", middleware.RequireLogin())
	adminOps.GET("/certs", middleware.RequirePerm(model.PermCertReview, rbac), wrap(h.AdminListCerts))
	adminOps.POST("/certs/:id/review", middleware.RequirePerm(model.PermCertReview, rbac), wrap(h.AdminReviewCert))
	adminOps.POST("/certify", middleware.RequirePerm(model.PermCertCertify, rbac), wrap(h.AdminCertify))
	adminOps.GET("/posts", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminListPosts))
	adminOps.POST("/posts/:id/hide", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminHidePost))
	adminOps.POST("/posts/:id/restore", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminRestorePost))
	adminOps.DELETE("/posts/:id", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminDeletePost))
	adminOps.GET("/comments", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminListComments))
	adminOps.POST("/comments/:id/hide", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminHideComment))
	adminOps.POST("/comments/:id/restore", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminRestoreComment))
	adminOps.DELETE("/comments/:id", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminDeleteComment))
	adminOps.GET("/reviews", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminListReviews))
	adminOps.POST("/reviews/:id/hide", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminHideReview))
	adminOps.POST("/reviews/:id/restore", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminRestoreReview))
	adminOps.DELETE("/reviews/:id", middleware.RequirePerm(model.PermContentMod, rbac), wrap(h.AdminDeleteReview))
	adminOps.GET("/jobs", middleware.RequirePerm(model.PermJobModerate, rbac), wrap(h.AdminListJobs))
	adminOps.DELETE("/jobs/:id", middleware.RequirePerm(model.PermJobModerate, rbac), wrap(h.AdminDeleteJob))
	adminOps.GET("/companies", middleware.RequirePerm(model.PermCompanyManage, rbac), wrap(h.AdminListCompanies))
	adminOps.PUT("/companies/:id", middleware.RequirePerm(model.PermCompanyManage, rbac), wrap(h.AdminUpdateCompany))

	// ---------- SPA 静态托管（移动端 web/dist） ----------
	attachSPA(r, cfg.Server.StaticDir)

	return r
}

func attachSPA(r *gin.Engine, webDir string) {
	if webDir == "" {
		return
	}
	abs, err := filepath.Abs(webDir)
	if err != nil || !dirExists(abs) {
		return
	}
	if dirExists(filepath.Join(abs, "assets")) {
		r.Static("/assets", filepath.Join(abs, "assets"))
	}
	r.NoRoute(spaFallback(abs))
}

// spaFallback SPA 兜底：命中静态目录里的真实文件（logo.png、favicon 等）按文件返回，
// 其余路径回退 index.html（前端路由）。仅允许目录内文件，拒绝路径穿越。
func spaFallback(abs string) gin.HandlerFunc {
	return func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api") || strings.HasPrefix(p, "/uploads") {
			c.JSON(http.StatusNotFound, httputil.Body{Code: 40400, Msg: "not found"})
			return
		}
		rel := filepath.Clean(strings.TrimPrefix(p, "/"))
		if rel != "" && rel != "." && !strings.HasPrefix(rel, "..") {
			f := filepath.Join(abs, rel)
			if st, err := os.Stat(f); err == nil && !st.IsDir() {
				c.File(f)
				return
			}
		}
		index := filepath.Join(abs, "index.html")
		if _, err := os.Stat(index); err == nil {
			c.File(index)
			return
		}
		c.String(http.StatusNotFound, "frontend not built")
	}
}

// NewAdmin 系统管理控制台：独立进程/独立端口，整服务仅内网访问。
// 只提供管理员登录与会话、/api/v1/sys 管理接口（RBAC 权限点守卫）和 PC 控制台静态资源。
func NewAdmin(h *handler.Handler, sm *session.Manager, cfg *config.Config, rbac *service.RbacService) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	if len(cfg.Server.TrustedProxies) > 0 {
		_ = r.SetTrustedProxies(cfg.Server.TrustedProxies)
	} else {
		_ = r.SetTrustedProxies(nil)
	}
	r.Use(gin.Recovery(), middleware.RequestLog(), middleware.CORS(cfg.CORS.Origins), middleware.Hydrate(sm))
	// 整个控制台服务仅内网
	r.Use(middleware.IntranetOnly())

	api := r.Group("/api/v1")
	api.GET("/health", wrap(func(c *gin.Context) (any, error) {
		return gin.H{"status": "up", "service": "admin"}, nil
	}))
	api.Use(middleware.GuardMustChangePwd())

	auth := api.Group("/auth")
	auth.POST("/login", wrap(h.Login))
	auth.POST("/logout", wrap(h.Logout))
	auth.GET("/me", wrap(h.Me))
	authLogin := auth.Group("", middleware.RequireLogin())
	authLogin.POST("/password", wrap(h.ChangePassword))

	sys := api.Group("/sys", middleware.RequireLogin())
	sys.GET("/users", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.AdminListUsers))
	sys.POST("/users", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.AdminCreateUser))
	sys.PUT("/users/:id", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.AdminUpdateUser))
	sys.DELETE("/users/:id", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.AdminDeleteUser))
	sys.GET("/users/:id/roles", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.GetUserRoles))
	sys.PUT("/users/:id/roles", middleware.RequirePerm(model.PermUserManage, rbac), wrap(h.SetUserRoles))
	sys.GET("/email-domains", middleware.RequirePerm(model.PermDomainManage, rbac), wrap(h.AdminListDomains))
	sys.POST("/email-domains", middleware.RequirePerm(model.PermDomainManage, rbac), wrap(h.AdminAddDomain))
	sys.POST("/email-domains/:id/toggle", middleware.RequirePerm(model.PermDomainManage, rbac), wrap(h.AdminToggleDomain))
	sys.POST("/announcements", middleware.RequirePerm(model.PermAnnounce, rbac), wrap(h.AdminCreateAnnouncement))
	sys.GET("/announcements", middleware.RequirePerm(model.PermAnnounce, rbac), wrap(h.ListAnnouncements))
	sys.GET("/roles", middleware.RequirePerm(model.PermRoleManage, rbac), wrap(h.ListRoles))
	sys.POST("/roles", middleware.RequirePerm(model.PermRoleManage, rbac), wrap(h.CreateRole))
	sys.PUT("/roles/:id", middleware.RequirePerm(model.PermRoleManage, rbac), wrap(h.UpdateRole))
	sys.DELETE("/roles/:id", middleware.RequirePerm(model.PermRoleManage, rbac), wrap(h.DeleteRole))
	sys.GET("/permissions", middleware.RequirePerm(model.PermRoleManage, rbac), wrap(h.ListPermissions))
	sys.GET("/configs", middleware.RequirePerm(model.PermConfigManage, rbac), wrap(h.GetSystemConfigs))
	sys.PUT("/configs", middleware.RequirePerm(model.PermConfigManage, rbac), wrap(h.UpdateSystemConfigs))
	sys.POST("/configs/mail-test", middleware.RequirePerm(model.PermConfigManage, rbac), wrap(h.MailTest))

	// PC 控制台静态资源（admin/dist，base=/）
	adminAbs := ""
	if cfg.Server.AdminStaticDir != "" {
		if abs, err := filepath.Abs(cfg.Server.AdminStaticDir); err == nil && dirExists(abs) {
			adminAbs = abs
		}
	}
	if adminAbs != "" {
		if dirExists(filepath.Join(adminAbs, "assets")) {
			r.Static("/assets", filepath.Join(adminAbs, "assets"))
		}
		r.NoRoute(spaFallback(adminAbs))
	}

	return r
}

func dirExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}
