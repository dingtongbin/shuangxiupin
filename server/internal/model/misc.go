package model

import "time"

type EmailDomain struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Domain    string    `gorm:"size:64;uniqueIndex;not null" json:"domain"`
	Enabled   bool      `gorm:"not null;default:true" json:"enabled"`
	Remark    string    `gorm:"size:64" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
}

// CertRequest 企业认证申请：用户提交后邮件通知运营，人工审核；
// 运营也可在后台直接按用户 ID 认证（不经此表）。
const (
	CertPending  = 1
	CertApproved = 2
	CertRejected = 3
)

type CertRequest struct {
	ID           int64      `gorm:"primaryKey" json:"id"`
	UserID       int64      `gorm:"not null;index" json:"user_id"`
	CompanyName  string     `gorm:"size:64;not null" json:"company_name"`
	ContactEmail string     `gorm:"size:64" json:"contact_email"`
	Note         string     `gorm:"size:500" json:"note"`
	Status       int        `gorm:"not null;default:1;index" json:"status"`
	RejectReason string     `gorm:"size:200" json:"reject_reason"`
	ReviewedBy   int64      `gorm:"not null;default:0" json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"-"`
}

type VerificationCode struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"size:64;index;not null" json:"email"`
	Purpose   string    `gorm:"size:16;not null" json:"purpose"`
	Code      string    `gorm:"size:6;not null" json:"code"`
	ExpireAt  time.Time `json:"expire_at"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
