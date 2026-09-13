package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 公开列表 ----------

// ListJobs 首页/搜索结果共用：最新排序 + 城市 + 六维筛选。
func (h *Handler) ListJobs(c *gin.Context) (any, error) {
	q := service.JobQuery{
		KW:       c.Query("kw"),
		City:     c.Query("city"),
		Industry: c.Query("industry"),
		Size:     c.Query("size"),
		Funding:  c.Query("funding"),
		Salary:   c.Query("salary"),
	}
	if v, err := strconv.Atoi(c.Query("education")); err == nil {
		q.Education = v
	}
	if v, err := strconv.Atoi(c.Query("experience")); err == nil {
		q.Experience = v
	}
	if v, err := strconv.ParseInt(c.Query("company_id"), 10, 64); err == nil {
		q.CompanyID = v
	}
	return h.jobs.List(q, toPageQuery(c))
}

func (h *Handler) GetJob(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	uid := middleware.UID(c)
	v, err := h.jobs.Detail(id, uid)
	if err != nil {
		return nil, err
	}
	h.history.Record(uid, model.TargetJob, id)
	return v, nil
}

// ---------- 企业招聘用户 ----------

func (h *Handler) CreateJob(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var in service.JobInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.jobs.Create(uid, in)
}

func (h *Handler) MyJobs(c *gin.Context) (any, error) {
	return h.jobs.My(middleware.UID(c), toPageQuery(c))
}

func (h *Handler) UpdateJob(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	var in service.JobInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.jobs.Update(uid, id, in)
}

func (h *Handler) CloseJob(c *gin.Context) (any, error) {
	return h.setJobStatus(c, 2)
}

func (h *Handler) OpenJob(c *gin.Context) (any, error) {
	return h.setJobStatus(c, 1)
}

func (h *Handler) setJobStatus(c *gin.Context, status int) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return nil, h.jobs.SetStatus(uid, id, status)
}

// ---------- 企业认证申请 ----------

func (h *Handler) SubmitCert(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var in service.CertSubmitInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.certs.Submit(uid, in)
}

func (h *Handler) MyCerts(c *gin.Context) (any, error) {
	return h.certs.My(middleware.UID(c), toPageQuery(c))
}
