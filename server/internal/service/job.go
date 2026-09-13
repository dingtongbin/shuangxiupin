package service

import (
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

var (
	contactEmailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	contactPhoneRe = regexp.MustCompile(`^[0-9+\-() ]{5,32}$`)
)

type JobService struct {
	db        *gorm.DB
	companies *CompanyService
}

func NewJob(db *gorm.DB, companies *CompanyService) *JobService {
	return &JobService{db: db, companies: companies}
}

type JobInput struct {
	CompanyID    int64         `json:"company_id"`
	Company      *CompanyInput `json:"company"`
	CreditCode   string        `json:"credit_code"` // 统一社会信用代码：优先按它关联公司主体
	Title        string        `json:"title" binding:"required"`
	SalaryMin    int           `json:"salary_min"`
	SalaryMax    int           `json:"salary_max"`
	Education    int           `json:"education"`
	Experience   int           `json:"experience"`
	City         string        `json:"city" binding:"required"`
	District     string        `json:"district"`
	Street       string        `json:"street"`
	ContactPhone string        `json:"contact_phone"`
	ContactEmail string        `json:"contact_email"`
	WorkCycle    string        `json:"work_cycle"`
	WorkDaysWeek int           `json:"work_days_week"`
	WorkHours    string        `json:"work_hours"`
	RecruitStart string        `json:"recruit_start"`
	RecruitEnd   string        `json:"recruit_end"`
	Description  string        `json:"description"`
}

// resolveCompany 公司主体：优先已有 company_id；否则按统一社会信用代码匹配；
// 最后按名称取/建（创建同时即点评主体，信用代码随单落库/补录）。
func (s *JobService) resolveCompany(uid int64, in *JobInput) (*model.Company, error) {
	if in.CompanyID > 0 {
		var c model.Company
		if err := s.db.First(&c, in.CompanyID).Error; err != nil {
			return nil, apperr.NotFound.With("所选公司不存在")
		}
		return &c, nil
	}
	code := strings.ToUpper(strings.TrimSpace(in.CreditCode))
	if code == "" && in.Company != nil {
		code = strings.ToUpper(strings.TrimSpace(in.Company.CreditCode))
	}
	if code != "" && !creditCodeRe.MatchString(code) {
		return nil, apperr.BadRequest.With("统一社会信用代码格式不正确（18 位）")
	}
	if code != "" {
		var c model.Company
		if err := s.db.Where("credit_code = ?", code).First(&c).Error; err == nil {
			return &c, nil
		}
	}
	if in.Company != nil && strings.TrimSpace(in.Company.Name) != "" {
		in.Company.CreditCode = code
		c, _, err := s.companies.GetOrCreate(uid, *in.Company)
		return c, err
	}
	return nil, apperr.BadRequest.With("请选择公司或填写公司名称")
}

func (s *JobService) validate(in *JobInput) error {
	in.Title = strings.TrimSpace(in.Title)
	if n := len([]rune(in.Title)); n < 2 || n > 64 {
		return apperr.BadRequest.With("职位名称需 2-64 个字")
	}
	if in.SalaryMin < 1 || in.SalaryMax > 999 || in.SalaryMin > in.SalaryMax {
		return apperr.BadRequest.With("薪资范围不正确（1k-999k）")
	}
	if in.Education == 0 {
		in.Education = 1
	}
	if !model.ValidDictValue(model.EducationOptions, in.Education) {
		return apperr.BadRequest.With("学历要求选项不合法")
	}
	if in.Experience == 0 {
		in.Experience = 1
	}
	if !model.ValidDictValue(model.ExperienceOptions, in.Experience) {
		return apperr.BadRequest.With("经验要求选项不合法")
	}
	in.City = strings.TrimSpace(in.City)
	if n := len([]rune(in.City)); n < 2 || n > 32 {
		return apperr.BadRequest.With("请填写工作城市")
	}
	in.District = strings.TrimSpace(in.District)
	in.Street = strings.TrimSpace(in.Street)
	if len([]rune(in.District)) > 32 || len([]rune(in.Street)) > 64 {
		return apperr.BadRequest.With("地区信息过长")
	}
	in.ContactPhone = strings.TrimSpace(in.ContactPhone)
	if len([]rune(in.ContactPhone)) > 32 {
		return apperr.BadRequest.With("联系电话过长")
	}
	if in.ContactPhone != "" && !contactPhoneRe.MatchString(in.ContactPhone) {
		return apperr.BadRequest.With("联系电话格式不正确（数字、-、+ 、空格）")
	}
	in.ContactEmail = strings.TrimSpace(in.ContactEmail)
	if len(in.ContactEmail) > 64 {
		return apperr.BadRequest.With("联系邮箱过长")
	}
	if in.ContactEmail != "" && !contactEmailRe.MatchString(in.ContactEmail) {
		return apperr.BadRequest.With("联系邮箱格式不正确")
	}
	in.Description = strings.TrimSpace(in.Description)
	if len([]rune(in.Description)) > 2000 {
		return apperr.BadRequest.With("职位描述最多 2000 字")
	}
	if n := len([]rune(in.WorkCycle)); n > 32 {
		return apperr.BadRequest.With("工作周期最多 32 个字")
	}
	if in.WorkDaysWeek < 0 || in.WorkDaysWeek > 7 {
		return apperr.BadRequest.With("每周工作天数需在 1-7 之间")
	}
	if n := len([]rune(in.WorkHours)); n > 64 {
		return apperr.BadRequest.With("每天工作时间最多 64 个字")
	}
	dateRe := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	if in.RecruitStart != "" && !dateRe.MatchString(in.RecruitStart) {
		return apperr.BadRequest.With("招聘开始日期格式应为 YYYY-MM-DD")
	}
	if in.RecruitEnd != "" && !dateRe.MatchString(in.RecruitEnd) {
		return apperr.BadRequest.With("招聘截止日期格式应为 YYYY-MM-DD")
	}
	return nil
}

// Create 企业招聘用户发布职位。
func (s *JobService) Create(uid int64, in JobInput) (*JobView, error) {
	comp, err := s.resolveCompany(uid, &in)
	if err != nil {
		return nil, err
	}
	if err := s.validate(&in); err != nil {
		return nil, err
	}
	j := &model.Job{
		CompanyID: comp.ID, PublisherID: uid, Title: in.Title,
		SalaryMin: in.SalaryMin, SalaryMax: in.SalaryMax,
		Education: in.Education, Experience: in.Experience,
		Description: in.Description,
		City:        in.City, District: in.District, Street: in.Street,
		ContactPhone: in.ContactPhone, ContactEmail: in.ContactEmail,
		WorkCycle:    strings.TrimSpace(in.WorkCycle), WorkDaysWeek: in.WorkDaysWeek,
		WorkHours:    strings.TrimSpace(in.WorkHours),
		RecruitStart: strings.TrimSpace(in.RecruitStart), RecruitEnd: strings.TrimSpace(in.RecruitEnd),
		Status: model.JobOpen,
	}
	if err := s.db.Create(j).Error; err != nil {
		return nil, err
	}
	return s.buildOne(j, comp, []int64{uid}), nil
}

type JobQuery struct {
	KW        string
	City      string
	Education int
	Experience int
	Industry  string
	Size      string
	Funding   string
	Salary    string
	CompanyID int64 // 公司主体页"在招职位"
}

// List 首页与搜索结果共用：最新排序 + 城市 + 六维筛选（懒加载分页）。
// 不放出发布者已注销/不存在的职位，也不放出已过招聘截止时间的职位。
func (s *JobService) List(q JobQuery, page httputil.PageQuery) (httputil.PageResult[JobView], error) {
	dbq := s.db.Model(&model.Job{}).Where("status = ?", model.JobOpen)
	dbq = dbq.Where("publisher_id IN (?)", s.db.Model(&model.User{}).Select("id").Where("deleted_at IS NULL"))
	dbq = dbq.Where("recruit_end = '' OR recruit_end >= ?", time.Now().Format("2006-01-02"))
	if q.CompanyID > 0 {
		dbq = dbq.Where("company_id = ?", q.CompanyID)
	}
	if kw := strings.TrimSpace(q.KW); kw != "" {
		var cids []int64
		s.db.Model(&model.Company{}).Where("name LIKE ?", "%"+kw+"%").Limit(200).Pluck("id", &cids)
		like := "%" + kw + "%"
		if len(cids) == 0 {
			dbq = dbq.Where("title LIKE ?", like)
		} else {
			dbq = dbq.Where("title LIKE ? OR company_id IN ?", like, cids)
		}
	}
	if city := strings.TrimSpace(q.City); city != "" {
		dbq = dbq.Where("city = ?", city)
	}
	if q.Education > 0 {
		if !model.ValidDictValue(model.EducationOptions, q.Education) {
			return httputil.PageResult[JobView]{}, apperr.BadRequest.With("学历筛选不合法")
		}
		dbq = dbq.Where("education = ?", q.Education)
	}
	if q.Experience > 1 {
		if !model.ValidDictValue(model.ExperienceOptions, q.Experience) {
			return httputil.PageResult[JobView]{}, apperr.BadRequest.With("经验筛选不合法")
		}
		dbq = dbq.Where("experience = ?", q.Experience)
	}
	if q.Industry != "" || q.Size != "" || q.Funding != "" {
		cq := s.db.Model(&model.Company{}).Select("id")
		if q.Industry != "" {
			cq = cq.Where("industry = ?", q.Industry)
		}
		if q.Size != "" {
			cq = cq.Where("size = ?", q.Size)
		}
		if q.Funding != "" {
			cq = cq.Where("funding = ?", q.Funding)
		}
		var cids []int64
		if err := cq.Limit(1000).Pluck("id", &cids).Error; err != nil {
			return httputil.PageResult[JobView]{}, err
		}
		if len(cids) == 0 {
			return httputil.PageOf([]JobView{}, 0, page), nil
		}
		dbq = dbq.Where("company_id IN ?", cids)
	}
	if q.Salary != "" {
		var bucket *model.SalaryBucket
		for i := range model.SalaryBuckets {
			if model.SalaryBuckets[i].Label == q.Salary {
				bucket = &model.SalaryBuckets[i]
				break
			}
		}
		if bucket == nil {
			return httputil.PageResult[JobView]{}, apperr.BadRequest.With("薪资筛选不合法")
		}
		if bucket.Max > 0 {
			dbq = dbq.Where("salary_min >= ? AND salary_min < ?", bucket.Min, bucket.Max)
		} else {
			dbq = dbq.Where("salary_min >= ?", bucket.Min)
		}
	}

	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	var jobs []model.Job
	if err := dbq.Order("created_at DESC, id DESC").
		Offset(page.Offset()).Limit(page.PageSize).Find(&jobs).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	return httputil.PageOf(s.buildMany(jobs), total, page), nil
}

func (s *JobService) My(uid int64, page httputil.PageQuery) (httputil.PageResult[JobView], error) {
	q := s.db.Model(&model.Job{}).Where("publisher_id = ?", uid)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	var jobs []model.Job
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&jobs).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	return httputil.PageOf(s.buildMany(jobs), total, page), nil
}

// Detail 职位详情：带 viewer 时返回收藏状态（页面另记浏览记录）。
// FavoritesOf 用户收藏的职位（按收藏时间倒序）。
func (s *JobService) FavoritesOf(uid int64, page httputil.PageQuery) (httputil.PageResult[JobView], error) {
	q := s.db.Model(&model.Favorite{}).Where("user_id = ? AND target_type = ?", uid, model.TargetJob)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	var favs []model.Favorite
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&favs).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	list := []JobView{}
	if len(favs) > 0 {
		ids := make([]int64, 0, len(favs))
		for _, f := range favs {
			ids = append(ids, f.TargetID)
		}
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
		list = s.buildMany(ordered)
	}
	return httputil.PageOf(list, total, page), nil
}

func (s *JobService) Detail(id, viewer int64) (*JobView, error) {
	var j model.Job
	if err := s.db.First(&j, id).Error; err != nil {
		return nil, apperr.NotFound.With("职位不存在或已下架")
	}
	comps := loadCompanies(s.db, []int64{j.CompanyID})
	briefs := loadUserBriefs(s.db, []int64{j.PublisherID})
	v := jobView(&j, comps[j.CompanyID], briefs[j.PublisherID])
	v.Favorited = loadFavorited(s.db, viewer, model.TargetJob, []int64{j.ID})[j.ID]
	return &v, nil
}

// Update 仅发布人可修改。
func (s *JobService) Update(uid, id int64, in JobInput) (*JobView, error) {
	var j model.Job
	if err := s.db.First(&j, id).Error; err != nil {
		return nil, apperr.NotFound.With("职位不存在")
	}
	if j.PublisherID != uid {
		return nil, apperr.Forbidden.With("只能修改自己发布的职位")
	}
	compID := j.CompanyID
	if in.CompanyID > 0 || (in.Company != nil && strings.TrimSpace(in.Company.Name) != "") {
		comp, err := s.resolveCompany(uid, &in)
		if err != nil {
			return nil, err
		}
		compID = comp.ID
	}
	if err := s.validate(&in); err != nil {
		return nil, err
	}
	updates := map[string]any{
		"title": in.Title, "salary_min": in.SalaryMin, "salary_max": in.SalaryMax,
		"education": in.Education, "experience": in.Experience,
		"city": in.City, "district": in.District, "street": in.Street,
		"contact_phone": in.ContactPhone, "contact_email": in.ContactEmail,
		"work_cycle": strings.TrimSpace(in.WorkCycle), "work_days_week": in.WorkDaysWeek,
		"work_hours": strings.TrimSpace(in.WorkHours),
		"recruit_start": strings.TrimSpace(in.RecruitStart), "recruit_end": strings.TrimSpace(in.RecruitEnd),
		"description": in.Description, "company_id": compID,
	}
	if err := s.db.Model(&j).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.Detail(j.ID, uid)
}

func (s *JobService) SetStatus(uid, id int64, status int) error {
	if status != model.JobOpen && status != model.JobClosed {
		return apperr.BadRequest.With("状态值不合法")
	}
	var j model.Job
	if err := s.db.First(&j, id).Error; err != nil {
		return apperr.NotFound.With("职位不存在")
	}
	if j.PublisherID != uid {
		return apperr.Forbidden.With("只能操作自己发布的职位")
	}
	return s.db.Model(&j).Update("status", status).Error
}

// ---------- 运营 ----------

func (s *JobService) AdminList(kw string, status int, page httputil.PageQuery) (httputil.PageResult[JobView], error) {
	dbq := s.db.Model(&model.Job{})
	if kw = strings.TrimSpace(kw); kw != "" {
		dbq = dbq.Where("title LIKE ?", "%"+kw+"%")
	}
	if status > 0 {
		dbq = dbq.Where("status = ?", status)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	var jobs []model.Job
	if err := dbq.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&jobs).Error; err != nil {
		return httputil.PageResult[JobView]{}, err
	}
	return httputil.PageOf(s.buildMany(jobs), total, page), nil
}

func (s *JobService) AdminDelete(id int64) error {
	var j model.Job
	if err := s.db.First(&j, id).Error; err != nil {
		return apperr.NotFound.With("职位不存在")
	}
	return s.db.Delete(&j).Error
}

// ---------- 装配 ----------

func (s *JobService) buildMany(jobs []model.Job) []JobView {
	compIDs := make([]int64, 0, len(jobs))
	userIDs := make([]int64, 0, len(jobs))
	for i := range jobs {
		compIDs = append(compIDs, jobs[i].CompanyID)
		userIDs = append(userIDs, jobs[i].PublisherID)
	}
	comps := loadCompanies(s.db, compIDs)
	briefs := loadUserBriefs(s.db, userIDs)
	list := make([]JobView, 0, len(jobs))
	for i := range jobs {
		list = append(list, jobView(&jobs[i], comps[jobs[i].CompanyID], briefs[jobs[i].PublisherID]))
	}
	return list
}

func (s *JobService) buildOne(j *model.Job, comp *model.Company, userIDs []int64) *JobView {
	if comp == nil {
		comps := loadCompanies(s.db, []int64{j.CompanyID})
		comp = comps[j.CompanyID]
	}
	briefs := loadUserBriefs(s.db, userIDs)
	v := jobView(j, comp, briefs[j.PublisherID])
	return &v
}
