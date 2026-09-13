package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/middleware"
)

// SearchJobs 搜索职位（与首页列表同一筛选模型）。
func (h *Handler) SearchJobs(c *gin.Context) (any, error) {
	return h.ListJobs(c)
}

// SearchPosts 搜索帖子。
func (h *Handler) SearchPosts(c *gin.Context) (any, error) {
	return h.posts.Search(c.Query("kw"), middleware.UID(c), toPageQuery(c))
}

// SearchCompanies 搜索点评主体。
func (h *Handler) SearchCompanies(c *gin.Context) (any, error) {
	return h.companies.List(c.Query("kw"), c.DefaultQuery("sort", "count_desc"), middleware.UID(c), toPageQuery(c))
}

// SearchUsers 搜索用户（关注用）。
func (h *Handler) SearchUsers(c *gin.Context) (any, error) {
	return h.search.Users(c.Query("kw"), middleware.UID(c), toPageQuery(c))
}

// ---------- WebSocket ----------

func (h *Handler) ServeWS(c *gin.Context) {
	uid := middleware.UID(c)
	if uid <= 0 {
		c.JSON(401, wsUnauthorizedBody())
		return
	}
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := newWSClient(uid, conn, h.hub)
	unread := h.notify.UnreadPayload(uid)
	h.hub.Serve(client,
		[]byte(`{"type":"hello","data":{"user_id":`+strconv.FormatInt(uid, 10)+`}}`),
		mustJSON(map[string]any{"type": "unread", "data": unread}),
	)
}
