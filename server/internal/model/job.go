package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	JobOpen   = 1
	JobClosed = 2
)

type Job struct {
	ID           int64          `gorm:"primaryKey" json:"id"`
	CompanyID    int64          `gorm:"not null;index" json:"company_id"`
	PublisherID  int64          `gorm:"not null;index" json:"publisher_id"`
	Title        string         `gorm:"size:64;not null" json:"title"`
	SalaryMin    int            `gorm:"not null" json:"salary_min"` // 单位 k
	SalaryMax    int            `gorm:"not null" json:"salary_max"` // 单位 k
	Education    int            `gorm:"not null;default:1" json:"education"`
	Experience   int            `gorm:"not null;default:1" json:"experience"`
	Description  string         `gorm:"type:text" json:"description"`
	City         string         `gorm:"size:32;not null;index" json:"city"`
	District     string         `gorm:"size:32" json:"district"`
	Street       string         `gorm:"size:64" json:"street"`
	ContactPhone string         `gorm:"size:32" json:"contact_phone"` // 联系电话（选填，详情页展示）
	ContactEmail string         `gorm:"size:64" json:"contact_email"` // 联系邮箱（选填，详情页展示）
	WorkCycle    string         `gorm:"size:32" json:"work_cycle"`    // 工作周期（如 长期/暑期2个月）
	WorkDaysWeek int            `gorm:"not null;default:0" json:"work_days_week"` // 每周工作几天（0=未填）
	WorkHours    string         `gorm:"size:64" json:"work_hours"`    // 每天工作时间（如 9:00-18:00）
	RecruitStart string         `gorm:"size:10" json:"recruit_start"` // 招聘开始日期 YYYY-MM-DD
	RecruitEnd   string         `gorm:"size:10" json:"recruit_end"`   // 招聘截止日期 YYYY-MM-DD
	Status       int            `gorm:"not null;default:1;index" json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"-"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
