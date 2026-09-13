package model

import "time"

// Announcement 系统公告：由运营/系统管理员发布，全员可见（无指定用户）。
// 与"系统消息"（系统自动触发的用户级通知）是两类东西。
type Announcement struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Content   string    `gorm:"size:500;not null" json:"content"`
	CreatedBy int64     `gorm:"not null;default:0" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}
