package service

import (
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/model"
)

// ---------- 视图结构（API 输出） ----------

type UserBrief struct {
	ID       int64  `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Role     int    `json:"role"` // 2=招聘者 3=运营，前端昵称旁渲染小标签
}

type SelfView struct {
	ID            int64     `json:"id"`
	Email         string    `json:"email"`
	Nickname      string    `json:"nickname"`
	Avatar        string    `json:"avatar"`
	Bio           string    `json:"bio"`
	ContactEmail  string    `json:"contact_email"`
	Role          int       `json:"role"`
	RoleLabel     string    `json:"role_label"`
	Perms         []string  `json:"perms"`
	CreatedAt     time.Time `json:"created_at"`
	MustChangePWD bool      `json:"must_change_pwd"`
}

type UserProfileView struct {
	UserBrief
	Bio            string    `json:"bio"`
	ContactEmail   string    `json:"contact_email"`
	Role           int       `json:"role"`
	RoleLabel      string    `json:"role_label"`
	CreatedAt      time.Time `json:"created_at"`
	PostCount      int64     `json:"post_count"`
	FollowerCount  int64     `json:"follower_count"`
	FollowingCount int64     `json:"following_count"`
	Following      bool      `json:"following"`
}

type CompanyBrief struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo"`
}

type ReviewView struct {
	ID        int64          `json:"id"`
	CompanyID int64          `json:"company_id"`
	User      UserBrief      `json:"user"`
	Overall   int            `json:"overall"`
	Dims      map[string]int `json:"dims"`
	Content   string         `json:"content"`
	LikeCount int            `json:"like_count"`
	Liked     bool           `json:"liked"`
	CreatedAt time.Time      `json:"created_at"`
}

type CompanyView struct {
	ID          int64       `json:"id"`
	Name        string      `json:"name"`
	Logo        string      `json:"logo"`
	Industry    string      `json:"industry"`
	Size        string      `json:"size"`
	Funding     string      `json:"funding"`
	RestType    int         `json:"rest_type"`
	RestLabel   string      `json:"rest_label"`
	CreditCode  string      `json:"credit_code"`
	LegalPerson string      `json:"legal_person"`
	RegCapital  string      `json:"reg_capital"`
	PaidCapital string      `json:"paid_capital"`
	InsuredCnt  int         `json:"insured_cnt"`
	FoundedOn   string      `json:"founded_on"`
	MainBiz     string      `json:"main_biz"`
	AvgRating   float64     `json:"avg_rating"`
	RatingCount int         `json:"rating_count"`
	ReviewCount int         `json:"review_count"`
	CreatedAt   time.Time   `json:"created_at"`
	TopReview   *ReviewView `json:"top_review,omitempty"`
}

type JobView struct {
	ID              int64        `json:"id"`
	Title           string       `json:"title"`
	SalaryText      string       `json:"salary_text"`
	SalaryMin       int          `json:"salary_min"`
	SalaryMax       int          `json:"salary_max"`
	Education       int          `json:"education"`
	EducationLabel  string       `json:"education_label"`
	Experience      int          `json:"experience"`
	ExperienceLabel string       `json:"experience_label"`
	City            string       `json:"city"`
	District        string       `json:"district"`
	Street          string       `json:"street"`
	RegionText      string       `json:"region_text"`
	ContactPhone    string       `json:"contact_phone"`
	ContactEmail    string       `json:"contact_email"`
	WorkCycle       string       `json:"work_cycle"`
	WorkDaysWeek    int          `json:"work_days_week"`
	WorkHours       string       `json:"work_hours"`
	RecruitStart    string       `json:"recruit_start"`
	RecruitEnd      string       `json:"recruit_end"`
	Description     string       `json:"description"`
	Status          int          `json:"status"`
	CreatedAt       time.Time    `json:"created_at"`
	Company         CompanyBrief `json:"company"`
	CompanySize     string       `json:"company_size"`
	CompanyFunding  string       `json:"company_funding"`
	CompanyIndustry string       `json:"company_industry"`
	Publisher       UserBrief    `json:"publisher"`
	Favorited       bool         `json:"favorited"` // 当前登录用户是否已收藏（详情页用）
}

type RepostRef struct {
	ID       int64  `json:"id"`
	Nickname string `json:"nickname"`
	Content  string `json:"content"`
}

// RepostAnswerRef 被转发的回答（引用块）。
type RepostAnswerRef struct {
	ID       int64  `json:"id"`
	PostID   int64  `json:"post_id"`
	Nickname string `json:"nickname"`
	Content  string `json:"content"`
}

type PostView struct {
	ID              int64            `json:"id"`
	User            UserBrief        `json:"user"`
	Content         string           `json:"content"`
	RepostOfID      int64            `json:"repost_of_id"`
	RepostOf        *RepostRef       `json:"repost_of,omitempty"`
	RepostCommentID int64            `json:"repost_comment_id"`
	RepostComment   *RepostAnswerRef `json:"repost_comment,omitempty"`
	LikeCount       int              `json:"like_count"`
	CommentCount    int              `json:"comment_count"`
	RepostCount     int              `json:"repost_count"`
	Liked           bool             `json:"liked"`
	Status          int              `json:"status"`
	CreatedAt       time.Time        `json:"created_at"`
}

type CommentView struct {
	ID            int64      `json:"id"`
	PostID        int64      `json:"post_id"`
	ParentID      int64      `json:"parent_id"`
	User          UserBrief  `json:"user"`
	ReplyToUserID int64      `json:"reply_to_user_id"`
	ReplyToUser   *UserBrief `json:"reply_to_user,omitempty"`
	Content       string     `json:"content"`
	LikeCount     int        `json:"like_count"`
	FavCount      int        `json:"fav_count"`
	Favorited     bool       `json:"favorited"`
	RepostCount   int        `json:"repost_count"`
	ReplyCount    int        `json:"reply_count"`
	Liked         bool       `json:"liked"`
	Status        int        `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
}

type NotificationView struct {
	ID        int64      `json:"id"`
	Type      int        `json:"type"`
	Sender    *UserBrief `json:"sender,omitempty"`
	PostID    int64      `json:"post_id"`
	CompanyID int64      `json:"company_id"`
	Content   string     `json:"content"`
	IsRead    bool       `json:"is_read"`
	CreatedAt time.Time  `json:"created_at"`
}

// ---------- 批量装配辅助 ----------

func newSelfView(u *model.User, perms []string) *SelfView {
	if perms == nil {
		perms = []string{}
	}
	return &SelfView{
		ID: u.ID, Email: u.Email, Nickname: u.Nickname, Avatar: u.Avatar,
		Bio: u.Bio, ContactEmail: u.ContactEmail,
		Role: u.Role, RoleLabel: model.RoleLabel(u.Role),
		Perms: perms, CreatedAt: u.CreatedAt, MustChangePWD: u.MustChangePWD,
	}
}

// loadUsers 批量取用户（含已注销，Unscoped）。
func loadUsers(db *gorm.DB, ids []int64) map[int64]*model.User {
	res := make(map[int64]*model.User)
	ids = uniqIDs(ids)
	if len(ids) == 0 {
		return res
	}
	var users []model.User
	if err := db.Unscoped().Where("id IN ?", ids).Find(&users).Error; err == nil {
		for i := range users {
			res[users[i].ID] = &users[i]
		}
	}
	return res
}

func uniqIDs(ids []int64) []int64 {
	seen := make(map[int64]struct{}, len(ids))
	out := ids[:0]
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

// loadUserBriefs 批量取用户摘要；已注销/缺失的 id 返回占位昵称。
func loadUserBriefs(db *gorm.DB, ids []int64) map[int64]UserBrief {
	res := make(map[int64]UserBrief)
	ids = uniqIDs(ids)
	if len(ids) == 0 {
		return res
	}
	var users []model.User
	if err := db.Unscoped().Where("id IN ?", ids).Find(&users).Error; err == nil {
		for _, u := range users {
			res[u.ID] = UserBrief{ID: u.ID, Nickname: u.VisibleNickname(), Avatar: u.Avatar, Role: u.Role}
		}
	}
	for _, id := range ids {
		if _, ok := res[id]; !ok {
			res[id] = UserBrief{ID: id, Nickname: "已注销用户"}
		}
	}
	return res
}

func loadCompanies(db *gorm.DB, ids []int64) map[int64]*model.Company {
	res := make(map[int64]*model.Company)
	ids = uniqIDs(ids)
	if len(ids) == 0 {
		return res
	}
	var cs []model.Company
	if err := db.Where("id IN ?", ids).Find(&cs).Error; err == nil {
		for i := range cs {
			res[cs[i].ID] = &cs[i]
		}
	}
	return res
}

func loadLiked(db *gorm.DB, uid int64, targetType int, ids []int64) map[int64]bool {
	res := make(map[int64]bool)
	if uid <= 0 || len(uniqIDs(ids)) == 0 {
		return res
	}
	var likes []model.Like
	if err := db.Where("user_id = ? AND target_type = ? AND target_id IN ?", uid, targetType, ids).
		Find(&likes).Error; err == nil {
		for _, l := range likes {
			res[l.TargetID] = true
		}
	}
	return res
}

func loadFavorited(db *gorm.DB, uid int64, targetType int, ids []int64) map[int64]bool {
	res := make(map[int64]bool)
	if uid <= 0 || len(uniqIDs(ids)) == 0 {
		return res
	}
	var favs []model.Favorite
	if err := db.Where("user_id = ? AND target_type = ? AND target_id IN ?", uid, targetType, ids).
		Find(&favs).Error; err == nil {
		for _, f := range favs {
			res[f.TargetID] = true
		}
	}
	return res
}

func parseDims(raw string) map[string]int {
	dims := make(map[string]int)
	if raw == "" {
		return dims
	}
	_ = json.Unmarshal([]byte(raw), &dims)
	return dims
}

func salaryText(min, max int) string {
	return fmt.Sprintf("%dk-%dk", min, max)
}

func regionText(city, district, street string) string {
	out := city
	if district != "" {
		out += " " + district
	}
	if street != "" {
		out += " " + street
	}
	return out
}

func companyView(c *model.Company) CompanyView {
	return CompanyView{
		ID: c.ID, Name: c.Name, Logo: c.Logo,
		Industry: c.Industry, Size: c.Size, Funding: c.Funding,
		RestType: c.RestType, RestLabel: model.RestTypeLabel(c.RestType),
		CreditCode: c.CreditCode, LegalPerson: c.LegalPerson,
		RegCapital: c.RegCapital, PaidCapital: c.PaidCapital,
		InsuredCnt: c.InsuredCnt, FoundedOn: c.FoundedOn, MainBiz: c.MainBiz,
		AvgRating: c.AvgRating(), RatingCount: c.RatingCount, ReviewCount: c.ReviewCount,
		CreatedAt: c.CreatedAt,
	}
}

func jobView(j *model.Job, comp *model.Company, publisher UserBrief) JobView {
	v := JobView{
		ID: j.ID, Title: j.Title,
		SalaryText: salaryText(j.SalaryMin, j.SalaryMax),
		SalaryMin:  j.SalaryMin, SalaryMax: j.SalaryMax,
		Education: j.Education, EducationLabel: optionLabel(model.EducationOptions, j.Education),
		Experience: j.Experience, ExperienceLabel: optionLabel(model.ExperienceOptions, j.Experience),
		City: j.City, District: j.District, Street: j.Street,
		RegionText:   regionText(j.City, j.District, j.Street),
		ContactPhone: j.ContactPhone, ContactEmail: j.ContactEmail,
		WorkCycle: j.WorkCycle, WorkDaysWeek: j.WorkDaysWeek, WorkHours: j.WorkHours,
		RecruitStart: j.RecruitStart, RecruitEnd: j.RecruitEnd,
		Description: j.Description,
		Status:      j.Status, CreatedAt: j.CreatedAt,
		Publisher: publisher,
	}
	if comp != nil {
		v.Company = CompanyBrief{ID: comp.ID, Name: comp.Name, Logo: comp.Logo}
		v.CompanySize = comp.Size
		v.CompanyFunding = comp.Funding
		v.CompanyIndustry = comp.Industry
	}
	return v
}

func optionLabel(opts []model.Option, v int) string {
	for _, o := range opts {
		if o.Value == v {
			return o.Label
		}
	}
	return "不限"
}
