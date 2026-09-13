package model

import (
	"time"

	"gorm.io/gorm"
)

// Comment 帖子评论；parent_id=0 为顶级评论，否则为回复（两级结构）。
type Comment struct {
	ID            int64          `gorm:"primaryKey" json:"id"`
	PostID        int64          `gorm:"not null;index" json:"post_id"`
	UserID        int64          `gorm:"not null;index" json:"user_id"`
	ParentID      int64          `gorm:"not null;default:0;index" json:"parent_id"`
	ReplyToUserID int64          `gorm:"not null;default:0" json:"reply_to_user_id"`
	Content       string         `gorm:"size:500;not null" json:"content"`
	LikeCount     int            `gorm:"not null;default:0" json:"like_count"`
	FavCount      int            `gorm:"not null;default:0" json:"fav_count"`    // 收藏数（回答）
	RepostCount   int            `gorm:"not null;default:0" json:"repost_count"` // 转发数（回答）
	ReplyCount    int            `gorm:"not null;default:0" json:"reply_count"`
	Status        int            `gorm:"not null;default:1" json:"status"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"-"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
