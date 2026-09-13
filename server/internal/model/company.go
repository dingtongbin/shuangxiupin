package model

import (
	"time"

	"gorm.io/gorm"
)

// 公司休息制度：绿=双休、红=单休、红黑=不定（前端取色）。
const (
	RestTypeDouble = 1 // 双休
	RestTypeSingle = 2 // 单休
	RestTypeUnset  = 3 // 不定
)

// Company 公司主体与点评主体 1:1（同一记录），按企业名称全局唯一；
// 工商信息（统一社会信用代码等）由运营维护，职位可按信用代码关联到主体。
type Company struct {
	ID          int64          `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:64;uniqueIndex;not null" json:"name"`
	Logo        string         `gorm:"size:255" json:"logo"`
	Industry    string         `gorm:"size:32;index" json:"industry"`
	Size        string         `gorm:"size:32;index" json:"size"`
	Funding     string         `gorm:"size:32;index" json:"funding"`
	RestType    int            `gorm:"not null;default:3;index" json:"rest_type"`
	CreditCode  string         `gorm:"size:32;index" json:"credit_code"`      // 统一社会信用代码
	LegalPerson string         `gorm:"size:32" json:"legal_person"`           // 法定代表人
	RegCapital  string         `gorm:"size:64" json:"reg_capital"`            // 注册资本
	PaidCapital string         `gorm:"size:64" json:"paid_capital"`           // 实缴资本
	InsuredCnt  int            `gorm:"not null;default:0" json:"insured_cnt"` // 参保人数
	FoundedOn   string         `gorm:"size:16" json:"founded_on"`             // 成立日期（YYYY-MM-DD）
	MainBiz     string         `gorm:"size:500" json:"main_biz"`              // 主营业务
	RatingSum   int64          `gorm:"not null;default:0" json:"rating_sum"`
	RatingCount int            `gorm:"not null;default:0" json:"rating_count"`
	ReviewCount int            `gorm:"not null;default:0" json:"review_count"`
	CreatedBy   int64          `gorm:"not null;default:0" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"-"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func RestTypeLabel(t int) string {
	switch t {
	case RestTypeDouble:
		return "双休"
	case RestTypeSingle:
		return "单休"
	default:
		return "不定"
	}
}

// AvgRating 平均分，保留 1 位小数。
func (c *Company) AvgRating() float64 {
	if c.RatingCount <= 0 {
		return 0
	}
	v := float64(c.RatingSum) / float64(c.RatingCount)
	return float64(int(v*10+0.5)) / 10
}
