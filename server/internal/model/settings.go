package model

import "time"

// SystemSetting 系统参数（键值对）：仅存被修改过的项，未存项回落到内置默认值。
type SystemSetting struct {
	Key       string    `gorm:"size:64;primaryKey" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SettingDef 系统参数定义（服务端唯一事实来源）。
type SettingDef struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Remark      string `json:"remark"`
	Type        string `json:"type"` // bool | int | string | secret
	Default     string `json:"default"`
	Placeholder string `json:"placeholder,omitempty"`
}

// 系统参数键。
const (
	SettingRegisterEnabled   = "register.enabled"
	SettingVerifyExpireMin   = "verify.expire_minutes"
	SettingVerifyIntervalSec = "verify.interval_seconds"
	SettingVerifyMaxAttempts = "verify.max_attempts"
	SettingVerifyDailyLimit  = "verify.daily_limit"
	SettingMailEnabled       = "mail.enabled"
	SettingMailHost          = "mail.host"
	SettingMailPort          = "mail.port"
	SettingMailUsername      = "mail.username"
	SettingMailPassword      = "mail.password"
	SettingMailFrom          = "mail.from"
	SettingMailSSL           = "mail.ssl"
	SettingMailNotifyTo      = "mail.notify_to"
)

// SettingDefByKey 按键取定义。
func SettingDefByKey(key string) (SettingDef, bool) {
	for _, d := range SystemSettingDefs() {
		if d.Key == key {
			return d, true
		}
	}
	return SettingDef{}, false
}

// SystemSettingDefs 全部可配置项。
// SMTP 默认值/提示文本按阿里云企业邮箱（smtp.qiye.aliyun.com，465+SSL）预置。
func SystemSettingDefs() []SettingDef {
	return []SettingDef{
		{Key: SettingRegisterEnabled, Name: "允许自助注册", Remark: "关闭后注册接口拒绝新用户（已注册账号不受影响）", Type: "bool", Default: "true"},
		{Key: SettingVerifyExpireMin, Name: "邮箱验证码有效期（分钟）", Remark: "超时后验证码作废", Type: "int", Default: "10"},
		{Key: SettingVerifyIntervalSec, Name: "验证码发送间隔（秒）", Remark: "同一邮箱两次发送的最小间隔", Type: "int", Default: "60"},
		{Key: SettingVerifyMaxAttempts, Name: "验证码最大错误次数", Remark: "单条验证码输错多少次后作废", Type: "int", Default: "5"},
		{Key: SettingVerifyDailyLimit, Name: "验证码每日发送上限", Remark: "同一邮箱每天最多发送条数", Type: "int", Default: "20"},
		{Key: SettingMailEnabled, Name: "启用邮件发送", Remark: "关闭时验证码仅记录到服务端日志", Type: "bool", Default: "false"},
		{Key: SettingMailHost, Name: "SMTP 服务器地址", Remark: "阿里企业邮箱：smtp.qiye.aliyun.com", Type: "string", Default: "smtp.qiye.aliyun.com", Placeholder: "smtp.qiye.aliyun.com"},
		{Key: SettingMailPort, Name: "SMTP 端口", Remark: "阿里企业邮箱 SSL 用 465；STARTTLS 用 587", Type: "int", Default: "465", Placeholder: "465"},
		{Key: SettingMailUsername, Name: "SMTP 用户名", Remark: "阿里企业邮箱账号，即发件邮箱", Type: "string", Default: "", Placeholder: "如 zhangsan@yourdomain.com"},
		{Key: SettingMailPassword, Name: "SMTP 密码/授权码", Remark: "阿里企业邮箱后台生成的密码或客户端专用密码；保存后不再回显", Type: "secret", Default: "", Placeholder: "请输入密码/授权码"},
		{Key: SettingMailFrom, Name: "发件人地址", Remark: "留空则使用 SMTP 用户名", Type: "string", Default: "", Placeholder: "如 zhangsan@yourdomain.com"},
		{Key: SettingMailSSL, Name: "使用 SSL(465)", Remark: "阿里企业邮箱 465 端口使用 SSL；587 端口请关闭", Type: "bool", Default: "true"},
		{Key: SettingMailNotifyTo, Name: "运营通知邮箱", Remark: "接收企业认证申请等内部通知", Type: "string", Default: "", Placeholder: "如 ops@yourdomain.com"},
	}
}
