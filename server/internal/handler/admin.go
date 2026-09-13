package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 用户管理（仅系统管理员；只管账号，不碰用户发表内容） ----------

func (h *Handler) AdminListUsers(c *gin.Context) (any, error) {
	role, _ := strconv.Atoi(c.Query("role"))
	status, _ := strconv.Atoi(c.Query("status"))
	return h.users.AdminList(c.Query("kw"), role, status, toPageQuery(c))
}

func (h *Handler) AdminCreateUser(c *gin.Context) (any, error) {
	var in service.AdminCreateUserInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.users.AdminCreate(c.Request.Context(), in)
}

func (h *Handler) AdminUpdateUser(c *gin.Context) (any, error) {
	adminID := currentAdmin(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	var in service.AdminUpdateUserInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.users.AdminUpdate(c.Request.Context(), adminID, id, in)
}

func (h *Handler) AdminDeleteUser(c *gin.Context) (any, error) {
	adminID := currentAdmin(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return nil, h.users.AdminDelete(c.Request.Context(), adminID, id)
}

// ---------- 企业认证（运营/系统管理员） ----------

func (h *Handler) AdminListCerts(c *gin.Context) (any, error) {
	status, _ := strconv.Atoi(c.Query("status"))
	return h.certs.AdminList(status, toPageQuery(c))
}

type certReviewReq struct {
	Approve bool   `json:"approve"`
	Reason  string `json:"reason"`
}

func (h *Handler) AdminReviewCert(c *gin.Context) (any, error) {
	adminID := currentAdmin(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	var req certReviewReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return h.certs.Review(c.Request.Context(), adminID, id, req.Approve, req.Reason)
}

type certifyReq struct {
	UserID      int64  `json:"user_id" binding:"required"`
	CompanyName string `json:"company_name"`
}

// AdminCertify 运营手动输入用户 ID 直接认证（不自动升级）。
func (h *Handler) AdminCertify(c *gin.Context) (any, error) {
	adminID := currentAdmin(c)
	var req certifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return h.certs.CertifyByID(c.Request.Context(), adminID, req.UserID, req.CompanyName)
}

// ---------- 内容运营（仅运营/系统管理员中的运营侧；系统管理员在路由层被禁止进入内容接口） ----------

func (h *Handler) AdminListPosts(c *gin.Context) (any, error) {
	status, _ := strconv.Atoi(c.Query("status"))
	return h.posts.AdminList(c.Query("kw"), status, toPageQuery(c))
}

func (h *Handler) AdminHidePost(c *gin.Context) (any, error) {
	return nil, h.posts.AdminHide(paramID(c))
}

func (h *Handler) AdminRestorePost(c *gin.Context) (any, error) {
	return nil, h.posts.AdminRestore(paramID(c))
}

func (h *Handler) AdminDeletePost(c *gin.Context) (any, error) {
	return nil, h.posts.AdminDelete(paramID(c))
}

func (h *Handler) AdminListComments(c *gin.Context) (any, error) {
	status, _ := strconv.Atoi(c.Query("status"))
	return h.comments.AdminList(c.Query("kw"), status, toPageQuery(c))
}

func (h *Handler) AdminHideComment(c *gin.Context) (any, error) {
	return nil, h.comments.AdminHide(paramID(c))
}

func (h *Handler) AdminRestoreComment(c *gin.Context) (any, error) {
	return nil, h.comments.AdminRestore(paramID(c))
}

func (h *Handler) AdminDeleteComment(c *gin.Context) (any, error) {
	return nil, h.comments.AdminDelete(paramID(c))
}

func (h *Handler) AdminListReviews(c *gin.Context) (any, error) {
	status, _ := strconv.Atoi(c.Query("status"))
	return h.companies.AdminListReviews(c.Query("kw"), status, toPageQuery(c))
}

func (h *Handler) AdminHideReview(c *gin.Context) (any, error) {
	return nil, h.companies.AdminHideReview(paramID(c))
}

func (h *Handler) AdminRestoreReview(c *gin.Context) (any, error) {
	return nil, h.companies.AdminRestoreReview(paramID(c))
}

func (h *Handler) AdminDeleteReview(c *gin.Context) (any, error) {
	return nil, h.companies.AdminDeleteReview(paramID(c))
}

func (h *Handler) AdminListJobs(c *gin.Context) (any, error) {
	status, _ := strconv.Atoi(c.Query("status"))
	return h.jobs.AdminList(c.Query("kw"), status, toPageQuery(c))
}

func (h *Handler) AdminDeleteJob(c *gin.Context) (any, error) {
	return nil, h.jobs.AdminDelete(paramID(c))
}

func (h *Handler) AdminListCompanies(c *gin.Context) (any, error) {
	return h.companies.AdminList(c.Query("kw"), toPageQuery(c))
}

func (h *Handler) AdminUpdateCompany(c *gin.Context) (any, error) {
	var in service.CompanyAdminInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.companies.AdminUpdate(paramID(c), in)
}

// ---------- 邮箱域名白名单（系统管理员） ----------

func (h *Handler) AdminListDomains(c *gin.Context) (any, error) {
	return h.misc.ListDomains()
}

type addDomainReq struct {
	Domain string `json:"domain" binding:"required"`
	Remark string `json:"remark"`
}

func (h *Handler) AdminAddDomain(c *gin.Context) (any, error) {
	var req addDomainReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	return h.misc.AddDomain(req.Domain, req.Remark)
}

func (h *Handler) AdminToggleDomain(c *gin.Context) (any, error) {
	return h.misc.ToggleDomain(paramID(c))
}

// ---------- 辅助 ----------

func paramID(c *gin.Context) int64 {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return 0
	}
	return id
}

func currentAdmin(c *gin.Context) int64 {
	return middleware.UID(c)
}
