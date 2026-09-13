package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 公司主体（=点评主体） ----------

// ListCompanies 广场点评列表（评分高低/人数多少/最新排序）。
func (h *Handler) ListCompanies(c *gin.Context) (any, error) {
	return h.companies.List(c.Query("kw"), c.DefaultQuery("sort", "count_desc"), middleware.UID(c), toPageQuery(c))
}

// CreateCompany 创建点评主体（公司主体同时创建，名称全局唯一）。
func (h *Handler) CreateCompany(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var in service.CompanyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	comp, created, err := h.companies.GetOrCreate(uid, in)
	if err != nil {
		return nil, err
	}
	view, err := h.companies.Detail(comp.ID, uid)
	if err != nil {
		return nil, err
	}
	return gin.H{"company": view, "created": created}, nil
}

func (h *Handler) GetCompany(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return h.companies.Detail(id, middleware.UID(c))
}

// CreateReview 对企业评分（1-5）并发表评价。
func (h *Handler) CreateReview(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	var in service.ReviewInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.companies.CreateReview(uid, id, in)
}

func (h *Handler) ListReviews(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return h.companies.ListReviews(id, c.DefaultQuery("sort", "latest"), middleware.UID(c), toPageQuery(c))
}
