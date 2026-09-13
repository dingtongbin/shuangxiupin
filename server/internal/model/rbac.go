package model

import "time"

// 内置角色 code（与 users.role 枚举对应，作为"主角色"的业务语义：
// users.role 决定产品行为（如企业用户才能发职位），RBAC 决定管理端权限）。
const (
	RoleCodeUser       = "user"
	RoleCodeEnterprise = "enterprise"
	RoleCodeOps        = "ops"
	RoleCodeSys        = "sys"
)

// 用户 ID 段：1-10000 保留给系统/管理员创建的账号，自助注册从 10001 开始。
const (
	ReservedUserIDMax   = 10000 // 保留段上界
	SelfRegisterStartID = 10001 // 自助注册起始 ID
)

// RolePriority 内置角色主角色优先级（多角色时推导 users.role 取最高）。
var RolePriority = map[string]int{
	RoleCodeUser:       1,
	RoleCodeEnterprise: 2,
	RoleCodeOps:        3,
	RoleCodeSys:        4,
}

// 权限点（管理端能力；业务行为仍由主角色约束）。
const (
	PermUserManage    = "user.manage"
	PermDomainManage  = "domain.manage"
	PermAnnounce      = "announce.manage"
	PermRoleManage    = "role.manage"
	PermCertReview    = "cert.review"
	PermCertCertify   = "cert.certify"
	PermContentMod    = "content.moderate"
	PermCompanyManage = "company.manage"
	PermJobModerate   = "job.moderate"
	PermConfigManage  = "config.manage"
)

type Permission struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Code      string    `gorm:"size:64;uniqueIndex;not null" json:"code"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Group     string    `gorm:"size:32;not null" json:"group"` // 系统管理 | 运营管理
	CreatedAt time.Time `json:"created_at"`
}

// Role 角色：内置角色不可删除、code/name 固定，权限可调；支持自定义角色。
type Role struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Code      string    `gorm:"size:32;uniqueIndex;not null" json:"code"`
	Name      string    `gorm:"size:32;not null" json:"name"`
	Builtin   bool      `gorm:"not null;default:false" json:"builtin"`
	Remark    string    `gorm:"size:100" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
}

type RolePermission struct {
	RoleID       int64 `gorm:"uniqueIndex:idx_role_perm,priority:1" json:"role_id"`
	PermissionID int64 `gorm:"uniqueIndex:idx_role_perm,priority:2" json:"permission_id"`
}

type UserRole struct {
	UserID int64 `gorm:"uniqueIndex:idx_user_role,priority:1" json:"user_id"`
	RoleID int64 `gorm:"uniqueIndex:idx_user_role,priority:2" json:"role_id"`
}

// BuiltinPermissions 权限点清单（种子数据）。
func BuiltinPermissions() []Permission {
	return []Permission{
		{Code: PermUserManage, Name: "用户管理", Group: "系统管理"},
		{Code: PermDomainManage, Name: "邮箱白名单", Group: "系统管理"},
		{Code: PermAnnounce, Name: "系统公告管理", Group: "系统管理"},
		{Code: PermRoleManage, Name: "角色与权限管理", Group: "系统管理"},
		{Code: PermCertReview, Name: "企业认证审核", Group: "运营管理"},
		{Code: PermCertCertify, Name: "按ID直接认证", Group: "运营管理"},
		{Code: PermContentMod, Name: "内容运营", Group: "运营管理"},
		{Code: PermCompanyManage, Name: "公司资料维护", Group: "运营管理"},
		{Code: PermJobModerate, Name: "职位管理", Group: "运营管理"},
		{Code: PermConfigManage, Name: "系统参数设置", Group: "系统管理"},
	}
}

// BuiltinRolePerms 内置角色 → 权限点映射（种子数据）。
// 注意：系统管理员只持有系统管理权限点，没有运营审核权限（硬性要求）。
func BuiltinRolePerms() map[string][]string {
	return map[string][]string{
		RoleCodeSys:        {PermUserManage, PermDomainManage, PermAnnounce, PermRoleManage, PermConfigManage},
		RoleCodeOps:        {PermCertReview, PermCertCertify, PermContentMod, PermCompanyManage, PermJobModerate},
		RoleCodeEnterprise: {},
		RoleCodeUser:       {},
	}
}

func RoleCodeFromEnum(role int) string {
	switch role {
	case RoleSysAdmin:
		return RoleCodeSys
	case RoleOps:
		return RoleCodeOps
	case RoleEnterprise:
		return RoleCodeEnterprise
	default:
		return RoleCodeUser
	}
}

// BuiltinPermissionCodes 内置权限点 code 集合（用于清理废弃项）。
func BuiltinPermissionCodes() []string {
	codes := make([]string, 0)
	for _, p := range BuiltinPermissions() {
		codes = append(codes, p.Code)
	}
	return codes
}
