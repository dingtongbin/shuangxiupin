package service

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

// HistoryService 浏览记录：浏览职位/问答时 upsert，列表按最近浏览排序。
type HistoryService struct {
	db   *gorm.DB
	jobs *JobService
}

func NewHistory(db *gorm.DB, jobs *JobService) *HistoryService {
	return &HistoryService{db: db, jobs: jobs}
}

// Record 登录用户浏览内容时调用；重复浏览只刷新时间。
func (s *HistoryService) Record(uid int64, targetType int, targetID int64) {
	if uid <= 0 || targetID <= 0 {
		return
	}
	h := model.ViewHistory{UserID: uid, TargetType: targetType, TargetID: targetID}
	s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "target_type"}, {Name: "target_id"}},
		DoUpdates: clause.Assignments(map[string]any{"updated_at": time.Now()}),
	}).Create(&h)
}

type HistoryItem struct {
	TargetType int       `json:"target_type"` // 1 问答 4 职位
	TargetID   int64     `json:"target_id"`
	Title      string    `json:"title"`
	Sub        string    `json:"sub"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// List 浏览记录（targetType=0 全部），已删除/隐藏的条目跳过。
func (s *HistoryService) List(uid int64, targetType int, page httputil.PageQuery) (httputil.PageResult[HistoryItem], error) {
	q := s.db.Model(&model.ViewHistory{}).Where("user_id = ?", uid)
	if targetType > 0 {
		q = q.Where("target_type = ?", targetType)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[HistoryItem]{}, err
	}
	var rows []model.ViewHistory
	if err := q.Order("updated_at DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&rows).Error; err != nil {
		return httputil.PageResult[HistoryItem]{}, err
	}
	list, err := s.buildItems(rows)
	if err != nil {
		return httputil.PageResult[HistoryItem]{}, err
	}
	return httputil.PageOf(list, total, page), nil
}

func (s *HistoryService) buildItems(rows []model.ViewHistory) ([]HistoryItem, error) {
	list := make([]HistoryItem, 0, len(rows))
	postIDs := make([]int64, 0, len(rows))
	jobIDs := make([]int64, 0, len(rows))
	for _, r := range rows {
		if r.TargetType == model.LikePost {
			postIDs = append(postIDs, r.TargetID)
		} else if r.TargetType == model.TargetJob {
			jobIDs = append(jobIDs, r.TargetID)
		}
	}
	posts := map[int64]*model.Post{}
	if len(postIDs) > 0 {
		var ps []model.Post
		if err := s.db.Where("id IN ? AND status = ?", postIDs, model.PostNormal).Find(&ps).Error; err != nil {
			return nil, err
		}
		for i := range ps {
			posts[ps[i].ID] = &ps[i]
		}
	}
	jobs := map[int64]*model.Job{}
	jobComps := map[int64]string{}
	if len(jobIDs) > 0 {
		var js []model.Job
		if err := s.db.Where("id IN ?", jobIDs).Find(&js).Error; err != nil {
			return nil, err
		}
		comps := loadCompanies(s.db, func() []int64 {
			out := make([]int64, 0, len(js))
			for i := range js {
				out = append(out, js[i].CompanyID)
			}
			return out
		}())
		for i := range js {
			jobs[js[i].ID] = &js[i]
			if c := comps[js[i].CompanyID]; c != nil {
				jobComps[js[i].ID] = c.Name
			}
		}
	}
	for _, r := range rows {
		switch r.TargetType {
		case model.LikePost:
			if p, ok := posts[r.TargetID]; ok {
				list = append(list, HistoryItem{
					TargetType: r.TargetType, TargetID: r.TargetID,
					Title: truncateRunes(p.Content, 60), Sub: "问答",
					UpdatedAt: r.UpdatedAt,
				})
			}
		case model.TargetJob:
			if j, ok := jobs[r.TargetID]; ok {
				sub := jobComps[j.ID]
				if sub != "" {
					sub += " · "
				}
				list = append(list, HistoryItem{
					TargetType: r.TargetType, TargetID: r.TargetID,
					Title: j.Title, Sub: sub + salaryText(j.SalaryMin, j.SalaryMax),
					UpdatedAt: r.UpdatedAt,
				})
			}
		}
	}
	return list, nil
}

// HistoryJobs 浏览过的职位（完整职位卡片，按最近浏览排序）。
func (s *HistoryService) HistoryJobs(uid int64, page httputil.PageQuery) (httputil.PageResult[JobView], error) {
	q := s.db.Model(&model.ViewHistory{}).
		Where("user_id = ? AND target_type = ?", uid, model.TargetJob)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	var rows []model.ViewHistory
	if err := q.Order("updated_at DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&rows).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	ids := make([]int64, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.TargetID)
	}
	list := []JobView{}
	if len(ids) > 0 {
		var jobs []model.Job
		if err := s.db.Where("id IN ?", ids).Find(&jobs).Error; err != nil {
			return httputil.PageResult[JobView]{}, err
		}
		byID := make(map[int64]model.Job, len(jobs))
		for i := range jobs {
			byID[jobs[i].ID] = jobs[i]
		}
		ordered := make([]model.Job, 0, len(ids))
		for _, id := range ids {
			if j, ok := byID[id]; ok {
				ordered = append(ordered, j)
			}
		}
		list = s.jobs.buildMany(ordered)
	}
	return httputil.PageOf(list, total, page), nil
}

// Clear 清空浏览记录。
func (s *HistoryService) Clear(uid int64) error {
	if uid <= 0 {
		return apperr.Unauthorized
	}
	return s.db.Where("user_id = ?", uid).Delete(&model.ViewHistory{}).Error
}
