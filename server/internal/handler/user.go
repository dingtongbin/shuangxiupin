package handler

import (
	"crypto/rand"
	"encoding/hex"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 个人资料 ----------

func (h *Handler) UpdateMe(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var in service.UpdateMeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.users.UpdateMe(uid, in)
}

func (h *Handler) GetUserProfile(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return h.users.GetProfile(middleware.UID(c), id)
}

func (h *Handler) GetUserPosts(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	// kind=post 仅原创问答，kind=repost 仅转发，默认全部
	return h.posts.ListByUser(id, middleware.UID(c), c.Query("kind"), toPageQuery(c))
}

// GetUserAnswers 用户（我的）回答列表。
func (h *Handler) GetUserAnswers(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return h.comments.ListByUser(id, middleware.UID(c), toPageQuery(c))
}

// ---------- 关注 ----------

func (h *Handler) GetFollow(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	viewer := middleware.UID(c)
	if viewer <= 0 {
		return gin.H{"following": false}, nil
	}
	return gin.H{"following": h.inter.IsFollowing(viewer, id)}, nil
}

func (h *Handler) ToggleFollow(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	following, err := h.inter.ToggleFollow(uid, id)
	if err != nil {
		return nil, err
	}
	return gin.H{"following": following}, nil
}

// ---------- 上传 ----------

var allowExts = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Handler) Upload(c *gin.Context) (any, error) {
	f, err := c.FormFile("file")
	if err != nil {
		return nil, apperr.BadRequest.With("请选择图片文件")
	}
	if f.Size > int64(h.cfg.Storage.MaxMB)*1024*1024 {
		return nil, apperr.BadRequest.Withf("图片最大 %dMB", h.cfg.Storage.MaxMB)
	}
	ext := strings.ToLower(filepath.Ext(f.Filename))
	if !allowExts[ext] {
		return nil, apperr.BadRequest.With("仅支持 jpg/png/gif/webp 图片")
	}
	sub := time.Now().Format("200601")
	key := sub + "/" + randHex(8) + ext
	src, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()
	url, err := h.store.Put(c.Request.Context(), key, src, f.Size, f.Header.Get("Content-Type"))
	if err != nil {
		return nil, err
	}
	return gin.H{"url": url}, nil
}

// ---------- 字典 ----------

func (h *Handler) Dicts(c *gin.Context) (any, error) {
	var domains []string
	h.db.Model(&model.EmailDomain{}).Where("enabled = ?", true).Order("id ASC").Pluck("domain", &domains)
	return gin.H{
		"register_enabled":        h.settings.GetBool(c.Request.Context(), model.SettingRegisterEnabled, true),
		"verify_interval_seconds": h.settings.GetInt(c.Request.Context(), model.SettingVerifyIntervalSec, 60),
		"educations":              model.EducationOptions,
		"experiences":             model.ExperienceOptions,
		"industries":              model.IndustryOptions,
		"sizes":                   model.SizeOptions,
		"fundings":                model.FundingOptions,
		"salary_buckets":          model.SalaryBuckets,
		"rest_types":              model.RestTypeOptions,
		"review_dims":             model.ReviewDims,
		"company_sorts":           model.CompanySorts,
		"email_domains":           domains,
	}, nil
}
