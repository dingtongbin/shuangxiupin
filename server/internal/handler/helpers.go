package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/httputil"
)

// toPageQuery 统一分页参数解析。
func toPageQuery(c *gin.Context) httputil.PageQuery {
	return httputil.BindPage(c)
}
