package httputil

import (
	"errors"
	"log/slog"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/shuangxiupin/server/internal/apperr"
)

// Body 统一响应信封。
type Body struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data any    `json:"data,omitempty"`
}

func OK(c *gin.Context, data any) {
	if data == nil {
		data = struct{}{}
	}
	c.JSON(200, Body{Code: 0, Msg: "ok", Data: data})
}

func Fail(c *gin.Context, err error) {
	var ae *apperr.Error
	if errors.As(err, &ae) {
		c.AbortWithStatusJSON(ae.Status, Body{Code: ae.Code, Msg: ae.Msg})
		return
	}
	slog.Error("internal error", "err", err, "path", c.Request.URL.Path)
	c.AbortWithStatusJSON(500, Body{Code: apperr.Server.Code, Msg: apperr.Server.Msg})
}

// Abort 供中间件使用：写错误并终止后续处理。
func Abort(c *gin.Context, err error) {
	Fail(c, err)
	c.Abort()
}

type PageQuery struct {
	Page     int
	PageSize int
}

func BindPage(c *gin.Context) PageQuery {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 10
	}
	return PageQuery{Page: page, PageSize: size}
}

func (p PageQuery) Offset() int { return (p.Page - 1) * p.PageSize }

type PageResult[T any] struct {
	List    []T   `json:"list"`
	Total   int64 `json:"total"`
	HasMore bool  `json:"has_more"`
}

func PageOf[T any](list []T, total int64, p PageQuery) PageResult[T] {
	if list == nil {
		list = []T{}
	}
	return PageResult[T]{List: list, Total: total, HasMore: int64(p.Page*p.PageSize) < total}
}
