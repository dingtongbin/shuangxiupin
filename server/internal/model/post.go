package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	PostNormal = 1
	PostHidden = 2
)

// Post 问答（求助）；用户"作品"即其发布的问答。repost_of_id 指向被转发的原问答，repost_comment_id 指向被转发的回答。
type Post struct {
	ID              int64          `gorm:"primaryKey" json:"id"`
	UserID          int64          `gorm:"not null;index" json:"user_id"`
	Content         string         `gorm:"type:text;not null" json:"content"`
	RepostOfID      int64          `gorm:"not null;default:0;index" json:"repost_of_id"`
	RepostCommentID int64          `gorm:"not null;default:0;index" json:"repost_comment_id"`
	LikeCount       int            `gorm:"not null;default:0" json:"like_count"`
	CommentCount    int            `gorm:"not null;default:0" json:"comment_count"`
	RepostCount     int            `gorm:"not null;default:0" json:"repost_count"`
	Status          int            `gorm:"not null;default:1;index" json:"status"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"-"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
