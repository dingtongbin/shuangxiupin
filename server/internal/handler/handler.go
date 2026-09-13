// Package handler HTTP 处理层：绑定参数 → 调 service → 返回 (data, error)。
package handler

import (
	"github.com/gorilla/websocket"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/config"
	"github.com/shuangxiupin/server/internal/mailer"
	"github.com/shuangxiupin/server/internal/service"
	"github.com/shuangxiupin/server/internal/session"
	"github.com/shuangxiupin/server/internal/storage"
	"github.com/shuangxiupin/server/internal/verify"
	"github.com/shuangxiupin/server/internal/ws"
)

type Handler struct {
	cfg           *config.Config
	db            *gorm.DB
	sess          *session.Manager
	verify        *verify.Service
	mail          *mailer.Mailer
	hub           *ws.Hub
	upgrader      *websocket.Upgrader
	rbac          *service.RbacService
	settings      *service.SettingsService
	announcements *service.AnnouncementService
	store         storage.Store

	auth      *service.AuthService
	users     *service.UserService
	certs     *service.CertService
	companies *service.CompanyService
	jobs      *service.JobService
	posts     *service.PostService
	comments  *service.CommentService
	inter     *service.InteractionService
	notify    *service.NotifyService
	search    *service.SearchService
	misc      *service.MiscService
	history   *service.HistoryService
}

func New(
	cfg *config.Config,
	db *gorm.DB,
	sm *session.Manager,
	vc *verify.Service,
	mail *mailer.Mailer,
	hub *ws.Hub,
	rbac *service.RbacService,
	store storage.Store,
	settings *service.SettingsService,
) *Handler {
	notify := service.NewNotify(db, hub)
	companies := service.NewCompany(db)
	posts := service.NewPost(db, notify)
	comments := service.NewComment(db, notify)
	inter := service.NewInteraction(db, notify)
	jobs := service.NewJob(db, companies)
	auth := service.NewAuth(db, sm, vc, rbac, settings)
	users := service.NewUser(db, sm, rbac)
	certs := service.NewCert(db, mail, cfg.Mail.NotifyTo, companies, notify, sm)
	search := service.NewSearch(db, posts, companies, jobs)
	misc := service.NewMisc(db)
	return &Handler{
		cfg: cfg, db: db, sess: sm, verify: vc, hub: hub,
		upgrader: newUpgrader(cfg.CORS.Origins),
		rbac:     rbac, store: store, settings: settings,
		mail:          mail,
		announcements: service.NewAnnouncement(db),
		auth:          auth, users: users, certs: certs, companies: companies,
		jobs: jobs, posts: posts, comments: comments, inter: inter,
		notify: notify, search: search, misc: misc,
		history: service.NewHistory(db, jobs),
	}
}
