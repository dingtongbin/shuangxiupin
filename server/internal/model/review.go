package model

import (
	"time"

	"gorm.io/gorm"
)

// Review 用户对企业的评价。Dims 为评分点 JSON：
// {"atmosphere":4,"welfare":3,"intensity":2,"growth":5}（键见 model.ReviewDims）。
type Review struct {
	ID        int64          `gorm:"primaryKey" json:"id"`
	CompanyID int64          `gorm:"not null;index" json:"company_id"`
	UserID    int64          `gorm:"not null;index" json:"user_id"`
	Overall   int            `gorm:"not null" json:"overall"` // 1-5
	Dims      string         `gorm:"type:json" json:"dims"`
	Content   string         `gorm:"type:text" json:"content"`
	LikeCount int            `gorm:"not null;default:0" json:"like_count"`
	Status    int            `gorm:"not null;default:1" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
