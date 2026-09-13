package service

import (
	"context"
	"log/slog"
	"regexp"
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/session"
)

var emailFmt = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type UserService struct {
	db   *gorm.DB
	sess *session.Manager
	rbac *RbacService
}

func NewUser(db *gorm.DB, sess *session.Manager, rbac *RbacService) *UserService {
	return &UserService{db: db, sess: sess, rbac: rbac}
}

// ---------- 个人资料 ----------

type UpdateMeInput struct {
	Nickname     *string `json:"nickname"`
	Bio          *string `json:"bio"`
	ContactEmail *string `json:"contact_email"`
	Avatar       *string `json:"avatar"`
}

func (s *UserService) UpdateMe(uid int64, in UpdateMeInput) (*SelfView, error) {
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return nil, apperr.Unauthorized
	}
	updates := map[string]any{}
	if in.Nickname != nil {
		nick, err := validNickname(*in.Nickname)
		if err != nil {
			return nil, err
		}
		if nick != "" {
			updates["nickname"] = nick
		}
	}
	if in.Bio != nil {
		bio := strings.TrimSpace(*in.Bio)
		if len([]rune(bio)) > 200 {
			return nil, apperr.BadRequest.With("简介最多 200 字")
		}
		updates["bio"] = bio
	}
	if in.ContactEmail != nil {
		ce := strings.ToLower(strings.TrimSpace(*in.ContactEmail))
		if ce != "" && !emailFmt.MatchString(ce) {
			return nil, apperr.BadRequest.With("联系邮箱格式不正确")
		}
		updates["contact_email"] = ce
	}
	if in.Avatar != nil {
		av := strings.TrimSpace(*in.Avatar)
		if len(av) > 255 {
			return nil, apperr.BadRequest.With("头像地址过长")
		}
		updates["avatar"] = av
	}
	if len(updates) > 0 {
		if err := s.db.Model(&u).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return newSelfView(&u, s.rbac.PermCodes(context.Background(), u.ID)), nil
}

// GetProfile 用户主页（含作品计数、关注关系）；已注销用户返回占位资料。
func (s *UserService) GetProfile(viewer, uid int64) (*UserProfileView, error) {
	var u model.User
	if err := s.db.Unscoped().First(&u, uid).Error; err != nil {
		return nil, apperr.NotFound.With("用户不存在")
	}
	contactEmail := u.ContactEmail
	if u.DeletedAt.Valid {
		contactEmail = ""
	}
	var postCount, followerCount, followingCount int64
	s.db.Model(&model.Post{}).Where("user_id = ? AND status = ?", uid, model.PostNormal).Count(&postCount)
	s.db.Model(&model.Follow{}).Where("followee_id = ?", uid).Count(&followerCount)
	s.db.Model(&model.Follow{}).Where("follower_id = ?", uid).Count(&followingCount)
	following := false
	if viewer > 0 && viewer != uid {
		var cnt int64
		s.db.Model(&model.Follow{}).
			Where("follower_id = ? AND followee_id = ?", viewer, uid).Count(&cnt)
		following = cnt > 0
	}
	return &UserProfileView{
		UserBrief:      UserBrief{ID: u.ID, Nickname: u.VisibleNickname(), Avatar: u.Avatar, Role: u.Role},
		Bio:            u.Bio,
		ContactEmail:   contactEmail,
		Role:           u.Role,
		RoleLabel:      model.RoleLabel(u.Role),
		CreatedAt:      u.CreatedAt,
		PostCount:      postCount,
		FollowerCount:  followerCount,
		FollowingCount: followingCount,
		Following:      following,
	}, nil
}

// ---------- 系统管理员：用户账号增删改查（不涉及任何用户发表内容） ----------

type AdminUserView struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Nickname  string `json:"nickname"`
	Role      int    `json:"role"`
	RoleLabel string `json:"role_label"`
	Status    int    `json:"status"`
	CreatedAt string `json:"created_at"`
}

func adminUserView(u *model.User) AdminUserView {
	return AdminUserView{
		ID: u.ID, Email: u.Email, Nickname: u.Nickname,
		Role: u.Role, RoleLabel: model.RoleLabel(u.Role),
		Status: u.Status, CreatedAt: u.CreatedAt.Format("2006-01-02 15:04"),
	}
}

type AdminCreateUserInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Nickname string `json:"nickname"`
	Role     int    `json:"role" binding:"required"`
}

func (s *UserService) AdminCreate(ctx context.Context, in AdminCreateUserInput) (*AdminUserView, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !emailFmt.MatchString(email) {
		return nil, apperr.BadRequest.With("邮箱格式不正确")
	}
	if err := validPassword(in.Password); err != nil {
		return nil, err
	}
	if in.Role < model.RoleUser || in.Role > model.RoleSysAdmin {
		return nil, apperr.BadRequest.With("角色不合法")
	}
	nick, err := validNickname(in.Nickname)
	if err != nil {
		return nil, err
	}
	if nick == "" {
		nick = genNickname()
	}
	var cnt int64
	s.db.Model(&model.User{}).Where("email = ?", email).Count(&cnt)
	if cnt > 0 {
		return nil, apperr.Conflict.With("该邮箱已被使用")
	}
	// 管理员创建的账号占用保留 ID 段（1-10000）
	var maxReserved int64
	if err := s.db.Model(&model.User{}).Where("id < ?", model.ReservedUserIDMax).
		Select("COALESCE(MAX(id), 0)").Scan(&maxReserved).Error; err != nil {
		return nil, err
	}
	if maxReserved >= model.ReservedUserIDMax {
		return nil, apperr.Conflict.With("保留 ID 段已用尽，无法再创建保留号段账号")
	}
	u := &model.User{
		ID:    maxReserved + 1,
		Email: email, PasswordHash: mustHash(in.Password), Nickname: nick,
		Role: in.Role, Status: model.StatusActive, ContactEmail: email,
	}
	if err := s.db.Create(u).Error; err != nil {
		return nil, err
	}
	s.rbac.SyncBuiltinUserRole(ctx, u.ID, in.Role)
	v := adminUserView(u)
	return &v, nil
}

func (s *UserService) AdminList(kw string, role, status int, page httputil.PageQuery) (httputil.PageResult[AdminUserView], error) {
	q := s.db.Model(&model.User{})
	if kw = strings.TrimSpace(kw); kw != "" {
		q = q.Where("email LIKE ? OR nickname LIKE ?", "%"+kw+"%", "%"+kw+"%")
	}
	if role > 0 {
		q = q.Where("role = ?", role)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[AdminUserView]{}, err
	}
	var users []model.User
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&users).Error; err != nil {
		return httputil.PageResult[AdminUserView]{}, err
	}
	list := make([]AdminUserView, 0, len(users))
	for i := range users {
		list = append(list, adminUserView(&users[i]))
	}
	return httputil.PageOf(list, total, page), nil
}

type AdminUpdateUserInput struct {
	Status   *int    `json:"status"`
	Role     *int    `json:"role"`
	Nickname *string `json:"nickname"`
	Password *string `json:"password"`
}

// AdminUpdate 系统管理员管理"用户本身"：状态/角色/昵称/重置密码。
// 不提供任何编辑用户发表内容的能力。
func (s *UserService) AdminUpdate(ctx context.Context, adminID, uid int64, in AdminUpdateUserInput) (*AdminUserView, error) {
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return nil, apperr.NotFound.With("用户不存在")
	}
	if uid == adminID && (in.Status != nil || in.Role != nil) {
		return nil, apperr.Forbidden.With("不能修改自己的角色或状态")
	}
	updates := map[string]any{}
	kick := false
	if in.Status != nil {
		if *in.Status != model.StatusActive && *in.Status != model.StatusDisabled {
			return nil, apperr.BadRequest.With("状态值不合法")
		}
		updates["status"] = *in.Status
		if *in.Status == model.StatusDisabled {
			kick = true
		}
	}
	if in.Role != nil {
		if *in.Role < model.RoleUser || *in.Role > model.RoleSysAdmin {
			return nil, apperr.BadRequest.With("角色不合法")
		}
		if *in.Role != u.Role {
			updates["role"] = *in.Role
			updates["__sync_user_role"] = *in.Role
			kick = true
		}
	}
	if in.Nickname != nil {
		nick, err := validNickname(*in.Nickname)
		if err != nil {
			return nil, err
		}
		if nick != "" {
			updates["nickname"] = nick
		}
	}
	if in.Password != nil {
		if err := validPassword(*in.Password); err != nil {
			return nil, err
		}
		updates["password_hash"] = mustHash(*in.Password)
		kick = true
	}
	delete(updates, "__sync_user_role")
	if len(updates) > 0 {
		if err := s.db.Model(&u).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if newRole, ok := updates["role"]; ok {
		s.rbac.SyncBuiltinUserRole(ctx, uid, newRole.(int))
	}
	if kick {
		s.sess.DestroyUser(ctx, uid)
	}
	_ = s.db.First(&u, uid).Error
	v := adminUserView(&u)
	return &v, nil
}

// AdminDelete 删除用户（硬删除账号；其发表内容保留但显示"已注销用户"）。
func (s *UserService) AdminDelete(ctx context.Context, adminID, uid int64) error {
	if uid == adminID {
		return apperr.Forbidden.With("不能删除自己")
	}
	var u model.User
	if err := s.db.First(&u, uid).Error; err != nil {
		return apperr.NotFound.With("用户不存在")
	}
	if err := s.db.Unscoped().Delete(&u).Error; err != nil {
		return err
	}
	s.db.Where("user_id = ?", uid).Delete(&model.UserRole{})
	s.sess.DestroyUser(ctx, uid)
	slog.Info("管理员删除用户", "admin", adminID, "uid", uid)
	return nil
}
