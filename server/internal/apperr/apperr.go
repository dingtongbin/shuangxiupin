// Package apperr 定义业务错误：携带 HTTP 状态码与业务错误码，
// 服务层返回 *Error，路由层统一转成 {code,msg,data} 信封。
package apperr

import "fmt"

type Error struct {
	Code   int    `json:"code"`
	Msg    string `json:"msg"`
	Status int    `json:"-"`
}

func (e *Error) Error() string { return e.Msg }

func New(status, code int, msg string) *Error {
	return &Error{Code: code, Msg: msg, Status: status}
}

// With 返回携带新文案的同错误副本。
func (e *Error) With(msg string) *Error {
	ne := *e
	ne.Msg = msg
	return &ne
}

func (e *Error) Withf(format string, a ...any) *Error {
	ne := *e
	ne.Msg = fmt.Sprintf(format, a...)
	return &ne
}

var (
	BadRequest    = New(400, 40000, "请求参数错误")
	Unauthorized  = New(401, 40100, "请先登录")
	Forbidden     = New(403, 40300, "没有权限")
	MustChangePwd = New(403, 40301, "请先修改初始密码")
	NotFound      = New(404, 40400, "内容不存在或已删除")
	Conflict      = New(409, 40900, "内容已存在")
	TooMany       = New(429, 42900, "操作过于频繁，请稍后再试")
	Server        = New(500, 50000, "服务繁忙，请稍后再试")
)
