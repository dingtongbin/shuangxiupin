package model

import "time"

// 点赞目标类型：帖子 / 评论 / 评价；收藏沿用同一套目标类型，4=职位。
const (
	LikePost    = 1
	LikeComment = 2
	LikeReview  = 3
	TargetJob   = 4
)

// 消息中心类型：1 系统消息，2-5 广场互动消息。
const (
	NotifySystem  = 1
	NotifyLike    = 2
	NotifyComment = 3
	NotifyFollow  = 4
	NotifyRepost  = 5
)

type Like struct {
	ID         int64     `gorm:"primaryKey" json:"id"`
	UserID     int64     `gorm:"not null;uniqueIndex:idx_like_user_target,priority:1" json:"user_id"`
	TargetType int       `gorm:"not null;uniqueIndex:idx_like_user_target,priority:2" json:"target_type"`
	TargetID   int64     `gorm:"not null;uniqueIndex:idx_like_user_target,priority:3" json:"target_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type Follow struct {
	ID         int64     `gorm:"primaryKey" json:"id"`
	FollowerID int64     `gorm:"not null;uniqueIndex:idx_follow_pair,priority:1" json:"follower_id"`
	FolloweeID int64     `gorm:"not null;uniqueIndex:idx_follow_pair,priority:2" json:"followee_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// Favorite 收藏：目标类型与点赞同构（当前用于问答的回答）。
type Favorite struct {
	ID         int64     `gorm:"primaryKey" json:"id"`
	UserID     int64     `gorm:"not null;uniqueIndex:idx_fav_user_target,priority:1" json:"user_id"`
	TargetType int       `gorm:"not null;uniqueIndex:idx_fav_user_target,priority:2" json:"target_type"`
	TargetID   int64     `gorm:"not null;uniqueIndex:idx_fav_user_target,priority:3" json:"target_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// ViewHistory 浏览记录：登录用户浏览职位/问答时落库并刷新时间。
type ViewHistory struct {
	ID         int64     `gorm:"primaryKey" json:"id"`
	UserID     int64     `gorm:"not null;uniqueIndex:idx_view_user_target,priority:1" json:"user_id"`
	TargetType int       `gorm:"not null;uniqueIndex:idx_view_user_target,priority:2" json:"target_type"`
	TargetID   int64     `gorm:"not null;uniqueIndex:idx_view_user_target,priority:3" json:"target_id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Notification struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	UserID    int64     `gorm:"not null;index:idx_notif_user_read,priority:1" json:"user_id"`
	Type      int       `gorm:"not null;index" json:"type"`
	SenderID  int64     `gorm:"not null;default:0" json:"sender_id"`
	PostID    int64     `gorm:"not null;default:0" json:"post_id"`
	CompanyID int64     `gorm:"not null;default:0" json:"company_id"`
	Content   string    `gorm:"size:255" json:"content"`
	IsRead    bool      `gorm:"not null;default:false;index:idx_notif_user_read,priority:2" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}
