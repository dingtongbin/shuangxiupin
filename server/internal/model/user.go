package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	RoleUser       = 1 // 普通用户
	RoleEnterprise = 2 // 企业招聘用户
	RoleOps        = 3 // 运营管理员
	RoleSysAdmin   = 4 // 系统管理员
)

const (
	StatusActive   = 1
	StatusDisabled = 2
)

type User struct {
	ID            int64          `gorm:"primaryKey" json:"id"`
	Email         string         `gorm:"size:64;uniqueIndex;not null" json:"email"`
	PasswordHash  string         `gorm:"size:100;not null" json:"-"`
	Nickname      string         `gorm:"size:32;not null" json:"nickname"`
	Avatar        string         `gorm:"size:255" json:"avatar"`
	Bio           string         `gorm:"size:200" json:"bio"`
	ContactEmail  string         `gorm:"size:64" json:"contact_email"`
	Role          int            `gorm:"not null;default:1;index" json:"role"`
	Status        int            `gorm:"not null;default:1;index" json:"status"`
	MustChangePWD bool           `gorm:"not null;default:false" json:"-"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"-"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func RoleLabel(role int) string {
	switch role {
	case RoleUser:
		return "普通用户"
	case RoleEnterprise:
		return "企业招聘用户"
	case RoleOps:
		return "运营管理员"
	case RoleSysAdmin:
		return "系统管理员"
	}
	return "未知角色"
}

func (u *User) VisibleNickname() string {
	if u.DeletedAt.Valid {
		return "已注销用户"
	}
	return u.Nickname
}
