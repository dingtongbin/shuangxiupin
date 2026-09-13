// Package verify 邮箱验证码：6 位数字，同邮箱 60s 限发一次、
// 10 分钟有效、最多输错 5 次作废、每邮箱每日上限 20 条。快速路径全在 Redis。
package verify

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"log/slog"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/mailer"
	"github.com/shuangxiupin/server/internal/model"
)

const (
	PurposeRegister = "register"
	PurposeReset    = "reset"
)

const domainCacheTTL = 10 * time.Minute

// 各限频/有效期参数由系统参数（settings）动态提供，此处仅保留兜底默认值。
const (
	defIntervalSec = 60
	defMaxAttempts = 5
	defSendPerDay  = 20
	defExpireMin   = 10
)

var emailRe = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type Service struct {
	rdb      *redis.Client
	db       *gorm.DB
	mail     *mailer.Mailer
	settings IntSettingProvider
}

// IntSettingProvider 整型系统参数读取（由 SettingsService 实现，避免循环依赖）。
type IntSettingProvider interface {
	GetInt(ctx context.Context, key string, def int) int
}

func New(db *gorm.DB, rdb *redis.Client, mail *mailer.Mailer, settings IntSettingProvider) *Service {
	return &Service{rdb: rdb, db: db, mail: mail, settings: settings}
}

func (s *Service) codeKey(email, purpose string) string {
	return fmt.Sprintf("sxu:vc:code:%s:%s", purpose, strings.ToLower(email))
}

func (s *Service) ValidateEmail(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if !emailRe.MatchString(email) {
		return apperr.BadRequest.With("邮箱格式不正确")
	}
	return nil
}

// CheckDomain 校验邮箱域名是否在白名单（国内知名邮箱）。
func (s *Service) CheckDomain(ctx context.Context, email string) error {
	idx := strings.LastIndex(email, "@")
	if idx < 0 {
		return apperr.BadRequest.With("邮箱格式不正确")
	}
	domain := strings.ToLower(email[idx+1:])
	cacheKey := "sxu:vc:domains"
	if ok, err := s.rdb.SIsMember(ctx, cacheKey, domain).Result(); err == nil && ok {
		return nil
	}
	var domains []string
	if err := s.db.Model(&model.EmailDomain{}).Where("enabled = ?", true).Pluck("domain", &domains).Error; err != nil {
		return apperr.Server.With("服务繁忙，请稍后再试")
	}
	if len(domains) == 0 {
		return apperr.Forbidden.With("系统未配置可用邮箱域名，请联系管理员")
	}
	pipe := s.rdb.TxPipeline()
	pipe.Del(ctx, cacheKey)
	pipe.SAdd(ctx, cacheKey, toAny(domains)...)
	pipe.Expire(ctx, cacheKey, domainCacheTTL)
	_, _ = pipe.Exec(ctx)
	for _, d := range domains {
		if d == domain {
			return nil
		}
	}
	return apperr.BadRequest.With("暂不支持该邮箱域名，请使用 163/QQ 等国内常见邮箱")
}

func toAny(ss []string) []any {
	out := make([]any, len(ss))
	for i, v := range ss {
		out[i] = v
	}
	return out
}

// Send 发送验证码（含全部限频逻辑）。
func (s *Service) Send(ctx context.Context, email, purpose string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if err := s.ValidateEmail(email); err != nil {
		return err
	}
	if purpose != PurposeRegister && purpose != PurposeReset {
		return apperr.BadRequest.With("验证码用途不合法")
	}
	if err := s.CheckDomain(ctx, email); err != nil {
		return err
	}
	// 发送间隔（系统参数）
	intervalSec := s.settings.GetInt(ctx, model.SettingVerifyIntervalSec, defIntervalSec)
	ok, err := s.rdb.SetNX(ctx, fmt.Sprintf("sxu:vc:rl:%s", email), 1, time.Duration(intervalSec)*time.Second).Result()
	if err != nil {
		return apperr.Server
	}
	if !ok {
		return apperr.TooMany.Withf("发送太频繁，请 %d 秒后再试", intervalSec)
	}
	// 每日上限（系统参数）
	dailyLimit := s.settings.GetInt(ctx, model.SettingVerifyDailyLimit, defSendPerDay)
	dlKey := fmt.Sprintf("sxu:vc:dl:%s:%s", email, time.Now().Format("20060102"))
	n, err := s.rdb.Incr(ctx, dlKey).Result()
	if err == nil && n == 1 {
		s.rdb.Expire(ctx, dlKey, 24*time.Hour)
	}
	if n > int64(dailyLimit) {
		return apperr.TooMany.With("今日发送次数已达上限，请明天再试")
	}

	// 有效期（系统参数）
	expireMin := s.settings.GetInt(ctx, model.SettingVerifyExpireMin, defExpireMin)
	expire := time.Duration(expireMin) * time.Minute
	code := genCode()
	key := s.codeKey(email, purpose)
	if err := s.rdb.HSet(ctx, key, map[string]any{"code": code, "attempts": 0}).Err(); err != nil {
		return apperr.Server
	}
	s.rdb.Expire(ctx, key, expire)

	if err := s.db.Create(&model.VerificationCode{
		Email: email, Purpose: purpose, Code: code,
		ExpireAt: time.Now().Add(expire),
	}).Error; err != nil {
		slog.Error("验证码审计写入失败", "err", err)
	}

	subject := "【双休聘】邮箱验证码"
	body := fmt.Sprintf(`<div style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:480px;margin:0 auto;padding:24px;">
<h2 style="color:#0a7d43;">双休聘</h2>
<p>你正在%s，验证码为：</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0a7d43;">%s</p>
<p style="color:#999;">%d 分钟内有效。请勿泄露给任何人；若非本人操作请忽略本邮件。</p></div>`,
		purposeText(purpose), code, expireMin)
	go func() {
		if err := s.mail.Send(email, subject, body); err != nil {
			slog.Error("验证码邮件发送失败", "to", email, "err", err)
		}
	}()
	return nil
}

func purposeText(p string) string {
	if p == PurposeReset {
		return "重置密码"
	}
	return "注册双休聘账号"
}

// Check 校验验证码；成功即作废（一次性）。
func (s *Service) Check(ctx context.Context, email, purpose, code string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	key := s.codeKey(email, purpose)
	vals, err := s.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		return apperr.Server
	}
	if len(vals) == 0 {
		return apperr.BadRequest.With("验证码已过期，请重新获取")
	}
	if subtle.ConstantTimeCompare([]byte(vals["code"]), []byte(strings.TrimSpace(code))) != 1 {
		maxAttempts := s.settings.GetInt(ctx, model.SettingVerifyMaxAttempts, defMaxAttempts)
		n, _ := s.rdb.HIncrBy(ctx, key, "attempts", 1).Result()
		if n >= int64(maxAttempts) {
			s.rdb.Del(ctx, key)
			return apperr.BadRequest.With("验证码错误次数过多已失效，请重新获取")
		}
		return apperr.BadRequest.Withf("验证码错误，还可尝试 %d 次", int64(maxAttempts)-n)
	}
	s.rdb.Del(ctx, key)
	s.db.Model(&model.VerificationCode{}).
		Where("email = ? AND purpose = ? AND used = ?", email, purpose, false).
		Order("id DESC").Limit(1).Update("used", true)
	return nil
}

func genCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}
