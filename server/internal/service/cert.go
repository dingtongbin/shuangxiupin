package service

import (
	"context"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/mailer"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/session"
)

// CertService 企业认证：申请后邮件通知我方运营邮箱，
// 运营在后台人工审核；也可直接按用户 ID 认证（绝不自动升级）。
type CertService struct {
	db        *gorm.DB
	mail      *mailer.Mailer
	notifyTo  string
	companies *CompanyService
	notify    *NotifyService
	sess      *session.Manager
}

func NewCert(db *gorm.DB, mail *mailer.Mailer, notifyTo string, companies *CompanyService, notify *NotifyService, sess *session.Manager) *CertService {
	return &CertService{db: db, mail: mail, notifyTo: notifyTo, companies: companies, notify: notify, sess: sess}
}

type CertSubmitInput struct {
	CompanyName  string `json:"company_name" binding:"required"`
	ContactEmail string `json:"contact_email"`
	Note         string `json:"note"`
}

type CertView struct {
	ID           int64      `json:"id"`
	User         *UserBrief `json:"user"`
	Email        string     `json:"email"`
	CompanyName  string     `json:"company_name"`
	ContactEmail string     `json:"contact_email"`
	Note         string     `json:"note"`
	Status       int        `json:"status"`
	RejectReason string     `json:"reject_reason"`
	CreatedAt    time.Time  `json:"created_at"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
}

func (s *CertService) buildViews(items []model.CertRequest) []CertView {
	ids := make([]int64, 0, len(items))
	for _, it := range items {
		ids = append(ids, it.UserID)
	}
	users := loadUsers(s.db, ids)
	list := make([]CertView, 0, len(items))
	for _, it := range items {
		v := CertView{
			ID: it.ID, CompanyName: it.CompanyName, ContactEmail: it.ContactEmail,
			Note: it.Note, Status: it.Status, RejectReason: it.RejectReason,
			CreatedAt: it.CreatedAt, ReviewedAt: it.ReviewedAt,
		}
		if u, ok := users[it.UserID]; ok {
			v.User = &UserBrief{ID: u.ID, Nickname: u.VisibleNickname(), Avatar: u.Avatar, Role: u.Role}
			v.Email = u.Email
		}
		list = append(list, v)
	}
	return list
}

func (s *CertService) Submit(uid int64, in CertSubmitInput) (*model.CertRequest, error) {
	name := strings.TrimSpace(in.CompanyName)
	if n := len([]rune(name)); n < 2 || n > 64 {
		return nil, apperr.BadRequest.With("企业名称需 2-64 个字")
	}
	ce := strings.ToLower(strings.TrimSpace(in.ContactEmail))
	if ce != "" && !emailFmt.MatchString(ce) {
		return nil, apperr.BadRequest.With("联系邮箱格式不正确")
	}
	note := strings.TrimSpace(in.Note)
	if len([]rune(note)) > 500 {
		return nil, apperr.BadRequest.With("备注最多 500 字")
	}
	r := &model.CertRequest{UserID: uid, CompanyName: name, ContactEmail: ce, Note: note, Status: model.CertPending}
	if err := s.db.Create(r).Error; err != nil {
		return nil, err
	}
	go s.notifyOps(r)
	return r, nil
}

// notifyOps 发邮件给我方运营（config.mail.notify_to）。
func (s *CertService) notifyOps(r *model.CertRequest) {
	if strings.TrimSpace(s.notifyTo) == "" {
		slog.Warn("未配置运营通知邮箱（mail.notify_to），认证申请仅入库", "cert_id", r.ID)
		return
	}
	var u model.User
	_ = s.db.First(&u, r.UserID).Error
	subject := "【双休聘】新企业认证申请"
	body := `<div style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:520px;margin:0 auto;padding:24px;">
<h2 style="color:#0a7d43;">双休聘 · 企业认证申请</h2>
<table style="border-collapse:collapse;line-height:2;">
<tr><td style="color:#888;padding-right:16px;">申请编号</td><td>#` + strconv.FormatInt(r.ID, 10) + `</td></tr>
<tr><td style="color:#888;">用户 ID</td><td><b>` + strconv.FormatInt(r.UserID, 10) + `</b></td></tr>
<tr><td style="color:#888;">用户邮箱</td><td>` + u.Email + `</td></tr>
<tr><td style="color:#888;">用户昵称</td><td>` + u.Nickname + `</td></tr>
<tr><td style="color:#888;">认证企业</td><td><b>` + r.CompanyName + `</b></td></tr>
<tr><td style="color:#888;">联系邮箱</td><td>` + r.ContactEmail + `</td></tr>
<tr><td style="color:#888;">申请备注</td><td>` + r.Note + `</td></tr>
</table>
<p style="color:#999;">请登录双休聘管理后台人工核实后处理。审核通过后该用户将升级为企业招聘用户。</p></div>`
	if err := s.mail.Send(s.notifyTo, subject, body); err != nil {
		slog.Error("认证申请邮件发送失败", "err", err)
	}
}

func (s *CertService) My(uid int64, page httputil.PageQuery) (httputil.PageResult[CertView], error) {
	q := s.db.Model(&model.CertRequest{}).Where("user_id = ?", uid)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CertView]{}, err
	}
	var items []model.CertRequest
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&items).Error; err != nil {
		return httputil.PageResult[CertView]{}, err
	}
	return httputil.PageOf(s.buildViews(items), total, page), nil
}

func (s *CertService) AdminList(status int, page httputil.PageQuery) (httputil.PageResult[CertView], error) {
	q := s.db.Model(&model.CertRequest{})
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CertView]{}, err
	}
	var items []model.CertRequest
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&items).Error; err != nil {
		return httputil.PageResult[CertView]{}, err
	}
	return httputil.PageOf(s.buildViews(items), total, page), nil
}

// Review 人工审核认证申请。
func (s *CertService) Review(ctx context.Context, reviewerID, id int64, approve bool, reason string) (*CertView, error) {
	var r model.CertRequest
	if err := s.db.First(&r, id).Error; err != nil {
		return nil, apperr.NotFound.With("申请不存在")
	}
	if r.Status != model.CertPending {
		return nil, apperr.Conflict.With("该申请已处理")
	}
	now := time.Now()
	if approve {
		if err := s.db.Model(&r).Updates(map[string]any{
			"status": model.CertApproved, "reviewed_by": reviewerID, "reviewed_at": now,
		}).Error; err != nil {
			return nil, err
		}
		var u model.User
		if err := s.db.First(&u, r.UserID).Error; err != nil {
			return nil, apperr.NotFound.With("用户不存在")
		}
		if u.Role != model.RoleEnterprise {
			if err := s.db.Model(&u).Update("role", model.RoleEnterprise).Error; err != nil {
				return nil, err
			}
			s.sess.DestroyUser(ctx, r.UserID)
		}
		// 认证通过即与该企业绑定：按申请的企业名称取/建点评主体（全局同名共用）
		if name := strings.TrimSpace(r.CompanyName); name != "" {
			if _, _, err := s.companies.GetOrCreate(r.UserID, CompanyInput{Name: name}); err != nil {
				slog.Error("认证通过后绑定企业失败", "cert_id", r.ID, "err", err)
			}
		}
		s.notify.Send(r.UserID, model.NotifySystem, 0,
			"你的企业认证已通过，已升级为企业招聘用户，请重新登录", 0, 0)
	} else {
		reason = strings.TrimSpace(reason)
		if reason == "" {
			reason = "资料不符合要求"
		}
		if err := s.db.Model(&r).Updates(map[string]any{
			"status": model.CertRejected, "reject_reason": reason,
			"reviewed_by": reviewerID, "reviewed_at": now,
		}).Error; err != nil {
			return nil, err
		}
		s.notify.Send(r.UserID, model.NotifySystem, 0,
			"你的企业认证未通过："+reason, 0, 0)
	}
	var u model.User
	_ = s.db.First(&u, r.UserID).Error
	v := CertView{
		ID: r.ID, CompanyName: r.CompanyName, ContactEmail: r.ContactEmail,
		Note: r.Note, Status: r.Status, RejectReason: r.RejectReason,
		CreatedAt: r.CreatedAt, ReviewedAt: r.ReviewedAt,
	}
	v.User = &UserBrief{ID: u.ID, Nickname: u.VisibleNickname(), Avatar: u.Avatar, Role: u.Role}
	v.Email = u.Email
	return &v, nil
}

// CertifyByID 运营直接按用户 ID 认证（手动输入，不自动）。
func (s *CertService) CertifyByID(ctx context.Context, adminID, uid int64, companyName string) (map[string]any, error) {
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return nil, apperr.NotFound.With("用户不存在")
	}
	if u.Role == model.RoleEnterprise {
		return nil, apperr.Conflict.With("该用户已是企业招聘用户")
	}
	if err := s.db.Model(&u).Update("role", model.RoleEnterprise).Error; err != nil {
		return nil, err
	}
	s.sess.DestroyUser(ctx, uid)
	s.notify.Send(uid, model.NotifySystem, 0,
		"你已被运营认证为企业招聘用户，请重新登录", 0, 0)
	companyID := int64(0)
	if name := strings.TrimSpace(companyName); name != "" {
		c, _, err := s.companies.GetOrCreate(uid, CompanyInput{Name: name})
		if err != nil {
			return nil, err
		}
		companyID = c.ID
	}
	slog.Info("运营认证企业用户", "admin", adminID, "uid", uid)
	return map[string]any{"user_id": uid, "company_id": companyID}, nil
}
