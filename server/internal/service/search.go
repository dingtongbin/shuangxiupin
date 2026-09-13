package service

import (
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

// UserSearchItem 用户搜索（广场-关注/找人）。
type UserSearchItem struct {
	UserBrief
	Bio       string `json:"bio"`
	Role      int    `json:"role"`
	RoleLabel string `json:"role_label"`
	Following bool   `json:"following"`
}

type SearchService struct {
	db        *gorm.DB
	posts     *PostService
	companies *CompanyService
	jobs      *JobService
}

func NewSearch(db *gorm.DB, posts *PostService, companies *CompanyService, jobs *JobService) *SearchService {
	return &SearchService{db: db, posts: posts, companies: companies, jobs: jobs}
}

func (s *SearchService) Users(kw string, viewer int64, page httputil.PageQuery) (httputil.PageResult[UserSearchItem], error) {
	kw = strings.TrimSpace(kw)
	if kw == "" {
		return httputil.PageOf([]UserSearchItem{}, 0, page), nil
	}
	q := s.db.Model(&model.User{}).
		Where("status = ? AND role IN ?", model.StatusActive, []int{model.RoleUser, model.RoleEnterprise}).
		Where("nickname LIKE ?", "%"+kw+"%")
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[UserSearchItem]{}, err
	}
	var users []model.User
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&users).Error; err != nil {
		return httputil.PageResult[UserSearchItem]{}, err
	}
	ids := make([]int64, 0, len(users))
	for i := range users {
		ids = append(ids, users[i].ID)
	}
	// 批量计算关注状态
	followMap := make(map[int64]bool)
	if viewer > 0 && len(ids) > 0 {
		var fs []model.Follow
		s.db.Where("follower_id = ? AND followee_id IN ?", viewer, ids).Find(&fs)
		for _, f := range fs {
			followMap[f.FolloweeID] = true
		}
	}
	list := make([]UserSearchItem, 0, len(users))
	for i := range users {
		list = append(list, UserSearchItem{
			UserBrief: UserBrief{ID: users[i].ID, Nickname: users[i].Nickname, Avatar: users[i].Avatar},
			Bio:       users[i].Bio, Role: users[i].Role, RoleLabel: model.RoleLabel(users[i].Role),
			Following: followMap[users[i].ID],
		})
	}
	return httputil.PageOf(list, total, page), nil
}
