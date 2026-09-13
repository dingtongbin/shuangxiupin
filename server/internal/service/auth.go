package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/session"
	"github.com/shuangxiupin/server/internal/verify"
)

type AuthService struct {
	db       *gorm.DB
	sess     *session.Manager
	verify   *verify.Service
	rbac     *RbacService
	settings *SettingsService
}

func NewAuth(db *gorm.DB, sess *session.Manager, vc *verify.Service, rbac *RbacService, settings *SettingsService) *AuthService {
	return &AuthService{db: db, sess: sess, verify: vc, rbac: rbac, settings: settings}
}

func (s *AuthService) selfView(u *model.User) *SelfView {
	return newSelfView(u, s.rbac.PermCodes(context.Background(), u.ID))
}

func validPassword(pwd string) error {
	if len(pwd) < 8 || len(pwd) > 64 {
		return apperr.BadRequest.With("密码需 8-64 位，且包含字母和数字")
	}
	var hasLetter, hasDigit bool
	for _, r := range pwd {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return apperr.BadRequest.With("密码需 8-64 位，且包含字母和数字")
	}
	return nil
}

func validNickname(nick string) (string, error) {
	nick = strings.TrimSpace(nick)
	if nick == "" {
		return "", nil
	}
	if n := len([]rune(nick)); n < 2 || n > 20 {
		return "", apperr.BadRequest.With("昵称需 2-20 个字")
	}
	return nick, nil
}

func genNickname() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("双休er%06d", 100000+n.Int64())
}

func mustHash(pwd string) string {
	b, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	return string(b)
}

func compareHash(hash, plain string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))
}

// SessionData 登录成功后由 handler 写入会话。
func (s *AuthService) SessionData(u *model.User) session.Data {
	return session.Data{UserID: u.ID, Role: u.Role, MustChangePWD: u.MustChangePWD}
}

// Register 邮箱注册（验证码在此校验），成功即视为登录态就绪。
func (s *AuthService) Register(ctx context.Context, email, code, password, nickname string) (*SelfView, error) {
	if !s.settings.GetBool(ctx, model.SettingRegisterEnabled, true) {
		return nil, apperr.Forbidden.With("当前未开放自助注册")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || code == "" {
		return nil, apperr.BadRequest.With("请填写邮箱与验证码")
	}
	if err := s.verify.Check(ctx, email, verify.PurposeRegister, code); err != nil {
		return nil, err
	}
	if err := validPassword(password); err != nil {
		return nil, err
	}
	nick, err := validNickname(nickname)
	if err != nil {
		return nil, err
	}
	if nick == "" {
		nick = genNickname()
	}
	var cnt int64
	if err := s.db.Model(&model.User{}).Where("email = ?", email).Count(&cnt).Error; err != nil {
		return nil, err
	}
	if cnt > 0 {
		return nil, apperr.Conflict.With("该邮箱已注册，请直接登录")
	}
	u := &model.User{
		Email: email, PasswordHash: mustHash(password), Nickname: nick,
		Role: model.RoleUser, Status: model.StatusActive, ContactEmail: email,
	}
	if err := s.db.Create(u).Error; err != nil {
		return nil, err
	}
	s.rbac.SyncBuiltinUserRole(ctx, u.ID, model.RoleUser)
	return s.selfView(u), nil
}

func (s *AuthService) Login(email, password string) (*SelfView, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var u model.User
	if err := s.db.Where("email = ?", email).First(&u).Error; err != nil {
		return nil, apperr.Unauthorized.With("邮箱或密码错误")
	}
	if err := compareHash(u.PasswordHash, password); err != nil {
		return nil, apperr.Unauthorized.With("邮箱或密码错误")
	}
	if u.Status == model.StatusDisabled {
		return nil, apperr.Forbidden.With("账号已被禁用，请联系管理员")
	}
	return s.selfView(&u), nil
}

func (s *AuthService) Me(uid int64) (*SelfView, error) {
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return nil, apperr.Unauthorized
	}
	if u.Status == model.StatusDisabled {
		return nil, apperr.Forbidden.With("账号已被禁用，请联系管理员")
	}
	return s.selfView(&u), nil
}

func (s *AuthService) ChangePassword(uid int64, oldPwd, newPwd string) error {
	if err := validPassword(newPwd); err != nil {
		return err
	}
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return apperr.Unauthorized
	}
	if err := compareHash(u.PasswordHash, oldPwd); err != nil {
		return apperr.BadRequest.With("当前密码不正确")
	}
	return s.db.Model(&u).Updates(map[string]any{
		"password_hash":   mustHash(newPwd),
		"must_change_pwd": false,
	}).Error
}

// ResetPassword 验证码重置密码并下线全部会话。
func (s *AuthService) ResetPassword(ctx context.Context, email, code, newPassword string) (*SelfView, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || code == "" {
		return nil, apperr.BadRequest.With("请填写邮箱与验证码")
	}
	if err := s.verify.Check(ctx, email, verify.PurposeReset, code); err != nil {
		return nil, err
	}
	if err := validPassword(newPassword); err != nil {
		return nil, err
	}
	var u model.User
	if err := s.db.Where("email = ?", email).First(&u).Error; err != nil {
		return nil, apperr.NotFound.With("该邮箱尚未注册")
	}
	if err := s.db.Model(&u).Updates(map[string]any{
		"password_hash":   mustHash(newPassword),
		"must_change_pwd": false,
	}).Error; err != nil {
		return nil, err
	}
	s.sess.DestroyUser(ctx, u.ID)
	return s.selfView(&u), nil
}
