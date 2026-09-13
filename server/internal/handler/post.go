package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/middleware"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/service"
)

// ---------- 帖子 ----------

// ListPosts 广场帖子流：tab = latest | follow。
func (h *Handler) ListPosts(c *gin.Context) (any, error) {
	tab := c.DefaultQuery("tab", "latest")
	viewer := middleware.UID(c)
	if tab == "follow" && viewer <= 0 {
		return nil, apperr.Unauthorized
	}
	return h.posts.Feed(tab, viewer, toPageQuery(c))
}

func (h *Handler) CreatePost(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var in service.PostInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.posts.Create(uid, in)
}

func (h *Handler) GetPost(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	uid := middleware.UID(c)
	v, err := h.posts.Detail(id, uid)
	if err != nil {
		return nil, err
	}
	h.history.Record(uid, model.LikePost, id)
	return v, nil
}

func (h *Handler) DeletePost(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return nil, h.posts.Delete(uid, id)
}

// DeleteComment 删除自己的评论（回复同理）。
func (h *Handler) DeleteComment(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return nil, h.comments.Delete(uid, id)
}

// ---------- 评论与回复 ----------

func (h *Handler) ListComments(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	return h.comments.ListTop(id, c.DefaultQuery("sort", "latest"), middleware.UID(c), toPageQuery(c))
}

func (h *Handler) CreateComment(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	postID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || postID <= 0 {
		return nil, apperr.NotFound
	}
	var in service.CommentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, apperr.BadRequest
	}
	return h.comments.Create(uid, postID, in)
}

func (h *Handler) ListReplies(c *gin.Context) (any, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return nil, apperr.NotFound
	}
	// 回复默认按点赞排序（需求指定），可切最新
	return h.comments.ListReplies(id, c.DefaultQuery("sort", "likes"), middleware.UID(c), toPageQuery(c))
}

// ---------- 点赞 ----------

type likeReq struct {
	TargetType int   `json:"target_type" binding:"required"`
	TargetID   int64 `json:"target_id" binding:"required"`
}

func (h *Handler) ToggleLike(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var req likeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	liked, count, err := h.inter.ToggleLike(uid, req.TargetType, req.TargetID)
	if err != nil {
		return nil, err
	}
	return gin.H{"liked": liked, "count": count}, nil
}

func (h *Handler) ToggleFavorite(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	var req likeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, apperr.BadRequest
	}
	favorited, count, err := h.inter.ToggleFavorite(uid, req.TargetType, req.TargetID)
	if err != nil {
		return nil, err
	}
	return gin.H{"favorited": favorited, "count": count}, nil
}

// MyFavorites 我的收藏：type=2 收藏的回答（默认），type=4 收藏的职位。
func (h *Handler) MyFavorites(c *gin.Context) (any, error) {
	uid := middleware.UID(c)
	if c.DefaultQuery("type", "2") == "4" {
		return h.jobs.FavoritesOf(uid, toPageQuery(c))
	}
	return h.comments.FavoritesOf(uid, toPageQuery(c))
}

// ---------- 浏览记录 ----------

func (h *Handler) ListHistory(c *gin.Context) (any, error) {
	t, _ := strconv.Atoi(c.Query("type"))
	return h.history.List(middleware.UID(c), t, toPageQuery(c))
}

// HistoryJobs 浏览过的职位（完整卡片）。
func (h *Handler) HistoryJobs(c *gin.Context) (any, error) {
	return h.history.HistoryJobs(middleware.UID(c), toPageQuery(c))
}

func (h *Handler) ClearHistory(c *gin.Context) (any, error) {
	return nil, h.history.Clear(middleware.UID(c))
}
