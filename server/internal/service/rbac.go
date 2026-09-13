// Package service — RBAC：角色/权限点/授权与权限缓存。
// 权限集缓存于 Redis（sxu:perms:<uid>，12h），角色/授权变更时按需失效。
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/model"
)

type RbacService struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewRbac(db *gorm.DB, rdb *redis.Client) *RbacService {
	return &RbacService{db: db, rdb: rdb}
}

func permKey(uid int64) string { return fmt.Sprintf("sxu:perms:%d", uid) }

// SessionKicker 由 *session.Manager 实现：角色变更后强制重新登录。
type SessionKicker interface {
	DestroyUser(ctx context.Context, uid int64)
}

func trimLower(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// PermCodes 用户权限点集合（Redis 缓存优先）。
func (s *RbacService) PermCodes(ctx context.Context, uid int64) []string {
	key := permKey(uid)
	if raw, err := s.rdb.Get(ctx, key).Result(); err == nil {
		var codes []string
		if json.Unmarshal([]byte(raw), &codes) == nil {
			return codes
		}
	}
	var codes []string
	err := s.db.Table("permissions p").
		Joins("JOIN role_permissions rp ON rp.permission_id = p.id").
		Joins("JOIN user_roles ur ON ur.role_id = rp.role_id").
		Where("ur.user_id = ?", uid).
		Distinct().Pluck("p.code", &codes).Error
	if err != nil {
		return []string{}
	}
	if codes == nil {
		codes = []string{}
	}
	if b, err := json.Marshal(codes); err == nil {
		s.rdb.Set(ctx, key, string(b), 12*time.Hour)
	}
	return codes
}

// HasPerm 供 RequirePerm 中间件使用（PermChecker 接口实现）。
func (s *RbacService) HasPerm(ctx context.Context, uid int64, code string) bool {
	for _, c := range s.PermCodes(ctx, uid) {
		if c == code {
			return true
		}
	}
	return false
}

func (s *RbacService) InvalidateUser(ctx context.Context, uid int64) {
	s.rdb.Del(ctx, permKey(uid))
}

// InvalidateAllPerms 权限点清单变更（如升级新增权限点）后全量失效。
func (s *RbacService) InvalidateAllPerms(ctx context.Context) {
	var cursor uint64
	for {
		keys, next, err := s.rdb.Scan(ctx, cursor, "sxu:perms:*", 500).Result()
		if err != nil {
			return
		}
		if len(keys) > 0 {
			s.rdb.Del(ctx, keys...)
		}
		cursor = next
		if cursor == 0 {
			return
		}
	}
}

// InvalidateRole 角色权限变更时，失效所有持有该角色用户的权限缓存。
func (s *RbacService) InvalidateRole(ctx context.Context, roleID int64) {
	var uids []int64
	s.db.Model(&model.UserRole{}).Where("role_id = ?", roleID).Pluck("user_id", &uids)
	for _, uid := range uids {
		s.InvalidateUser(ctx, uid)
	}
}

// ---------- 角色 / 权限查询 ----------

type RoleView struct {
	ID          int64     `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Builtin     bool      `json:"builtin"`
	Remark      string    `json:"remark"`
	Permissions []string  `json:"permissions"`
	UserCount   int64     `json:"user_count"`
	CreatedAt   time.Time `json:"created_at"`
}

func (s *RbacService) ListRoles() ([]RoleView, error) {
	var roles []model.Role
	if err := s.db.Order("id ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	type rp struct {
		RoleID int64
		Code   string
	}
	var rps []rp
	s.db.Table("role_permissions rp").
		Select("rp.role_id AS role_id, p.code AS code").
		Joins("JOIN permissions p ON p.id = rp.permission_id").Scan(&rps)
	permMap := make(map[int64][]string)
	for _, r := range rps {
		permMap[r.RoleID] = append(permMap[r.RoleID], r.Code)
	}
	out := make([]RoleView, 0, len(roles))
	for _, r := range roles {
		var cnt int64
		s.db.Model(&model.UserRole{}).Where("role_id = ?", r.ID).Count(&cnt)
		perms := permMap[r.ID]
		if perms == nil {
			perms = []string{}
		}
		out = append(out, RoleView{
			ID: r.ID, Code: r.Code, Name: r.Name, Builtin: r.Builtin, Remark: r.Remark,
			Permissions: perms, UserCount: cnt, CreatedAt: r.CreatedAt,
		})
	}
	return out, nil
}

func (s *RbacService) ListPermissions() ([]model.Permission, error) {
	var ps []model.Permission
	if err := s.db.Order("`group` ASC, id ASC").Find(&ps).Error; err != nil {
		return nil, err
	}
	return ps, nil
}

// ---------- 角色管理 ----------

var roleCodeRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,31}$`)

func (s *RbacService) resolvePerms(permIDs []int64) error {
	for _, id := range permIDs {
		var cnt int64
		s.db.Model(&model.Permission{}).Where("id = ?", id).Count(&cnt)
		if cnt == 0 {
			return apperr.BadRequest.Withf("权限点不存在：%d", id)
		}
	}
	return nil
}

func (s *RbacService) replaceRolePerms(tx *gorm.DB, roleID int64, permIDs []int64) error {
	if err := tx.Where("role_id = ?", roleID).Delete(&model.RolePermission{}).Error; err != nil {
		return err
	}
	for _, pid := range permIDs {
		if err := tx.Create(&model.RolePermission{RoleID: roleID, PermissionID: pid}).Error; err != nil {
			return err
		}
	}
	return nil
}

type RoleInput struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Remark      string  `json:"remark"`
	Permissions []int64 `json:"permissions"` // 允许空数组（清空全部权限点）
}

func (s *RbacService) CreateRole(ctx context.Context, in RoleInput) (*RoleView, error) {
	in.Code = trimLower(in.Code)
	if !roleCodeRe.MatchString(in.Code) {
		return nil, apperr.BadRequest.With("角色编码需以小写字母开头的 2-32 位小写字母/数字/下划线")
	}
	if n := len([]rune(in.Name)); n < 2 || n > 20 {
		return nil, apperr.BadRequest.With("角色名称需 2-20 个字")
	}
	if err := s.resolvePerms(in.Permissions); err != nil {
		return nil, err
	}
	var cnt int64
	s.db.Model(&model.Role{}).Where("code = ?", in.Code).Count(&cnt)
	if cnt > 0 {
		return nil, apperr.Conflict.With("角色编码已存在")
	}
	r := &model.Role{Code: in.Code, Name: in.Name, Builtin: false, Remark: in.Remark}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(r).Error; err != nil {
			return err
		}
		return s.replaceRolePerms(tx, r.ID, in.Permissions)
	})
	if err != nil {
		return nil, err
	}
	return s.roleView(r.ID)
}

func (s *RbacService) UpdateRole(ctx context.Context, id int64, in RoleInput) (*RoleView, error) {
	var r model.Role
	if err := s.db.First(&r, id).Error; err != nil {
		return nil, apperr.NotFound.With("角色不存在")
	}
	if err := s.resolvePerms(in.Permissions); err != nil {
		return nil, err
	}
	updates := map[string]any{}
	if !r.Builtin {
		if in.Name != "" {
			if n := len([]rune(in.Name)); n < 2 || n > 20 {
				return nil, apperr.BadRequest.With("角色名称需 2-20 个字")
			}
			updates["name"] = in.Name
		}
		if in.Remark != "" {
			updates["remark"] = in.Remark
		}
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&r).Updates(updates).Error; err != nil {
				return err
			}
		}
		return s.replaceRolePerms(tx, r.ID, in.Permissions)
	})
	if err != nil {
		return nil, err
	}
	s.InvalidateRole(ctx, id)
	return s.roleView(id)
}

// DeleteRole 内置角色不可删除；仍有用户持有亦不可删。
func (s *RbacService) DeleteRole(ctx context.Context, id int64) error {
	var r model.Role
	if err := s.db.First(&r, id).Error; err != nil {
		return apperr.NotFound.With("角色不存在")
	}
	if r.Builtin {
		return apperr.Forbidden.With("内置角色不可删除")
	}
	var cnt int64
	s.db.Model(&model.UserRole{}).Where("role_id = ?", id).Count(&cnt)
	if cnt > 0 {
		return apperr.Conflict.With("仍有用户持有该角色，请先调整用户角色")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", id).Delete(&model.RolePermission{}).Error; err != nil {
			return err
		}
		return tx.Delete(&r).Error
	})
}

func (s *RbacService) roleView(id int64) (*RoleView, error) {
	views, err := s.ListRoles()
	if err != nil {
		return nil, err
	}
	for i := range views {
		if views[i].ID == id {
			return &views[i], nil
		}
	}
	return nil, apperr.NotFound.With("角色不存在")
}

// UserRoles 用户当前持有的角色 ID 列表。
func (s *RbacService) UserRoles(ctx context.Context, uid int64) ([]int64, error) {
	var ids []int64
	if err := s.db.Model(&model.UserRole{}).Where("user_id = ?", uid).Pluck("role_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

// SetUserRoles 调整用户角色（整体替换），并同步主角色 users.role：
// 取所含内置角色中优先级最高者；自定义角色不影响主角色。
func (s *RbacService) SetUserRoles(ctx context.Context, uid int64, roleIDs []int64, sess SessionKicker) (perms []string, err error) {
	if len(roleIDs) == 0 {
		return nil, apperr.BadRequest.With("至少保留一个角色")
	}
	var roles []model.Role
	if err := s.db.Where("id IN ?", roleIDs).Find(&roles).Error; err != nil {
		return nil, err
	}
	if len(roles) != len(uniqI64(roleIDs)) {
		return nil, apperr.BadRequest.With("包含无效角色")
	}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", uid).Delete(&model.UserRole{}).Error; err != nil {
			return err
		}
		for _, rid := range uniqI64(roleIDs) {
			if err := tx.Create(&model.UserRole{UserID: uid, RoleID: rid}).Error; err != nil {
				return err
			}
		}
		// 同步主角色
		primary := ""
		top := 0
		for _, r := range roles {
			if p, ok := model.RolePriority[r.Code]; ok && p > top {
				top = p
				primary = r.Code
			}
		}
		if primary != "" {
			return tx.Model(&model.User{}).Where("id = ?", uid).
				Update("role", roleEnumFromCode(primary)).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.InvalidateUser(ctx, uid)
	sess.DestroyUser(ctx, uid) // 主角色可能变化，重新登录生效
	return s.PermCodes(ctx, uid), nil
}

func roleEnumFromCode(code string) int {
	switch code {
	case model.RoleCodeSys:
		return model.RoleSysAdmin
	case model.RoleCodeOps:
		return model.RoleOps
	case model.RoleCodeEnterprise:
		return model.RoleEnterprise
	default:
		return model.RoleUser
	}
}

func uniqI64(in []int64) []int64 {
	seen := make(map[int64]struct{}, len(in))
	out := in[:0]
	for _, v := range in {
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

// SyncBuiltinUserRole 使 user_roles 与 users.role 保持一致（改主角色时调用）。
func (s *RbacService) SyncBuiltinUserRole(ctx context.Context, uid int64, roleEnum int) {
	code := model.RoleCodeFromEnum(roleEnum)
	var r model.Role
	if err := s.db.Where("code = ?", code).First(&r).Error; err != nil {
		return
	}
	s.db.Where("user_id = ?", uid).Delete(&model.UserRole{})
	s.db.Create(&model.UserRole{UserID: uid, RoleID: r.ID})
	s.InvalidateUser(ctx, uid)
}
