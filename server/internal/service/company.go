package service

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

type CompanyService struct {
	db *gorm.DB
}

func NewCompany(db *gorm.DB) *CompanyService { return &CompanyService{db: db} }

type CompanyInput struct {
	Name       string `json:"name" binding:"required"`
	Logo       string `json:"logo"`
	Industry   string `json:"industry"`
	Size       string `json:"size"`
	Funding    string `json:"funding"`
	RestType   int    `json:"rest_type"`
	CreditCode string `json:"credit_code"` // 统一社会信用代码（招聘/认证关联用）
}

func validateCompanyFields(industry, size, funding string, restType int) (int, error) {
	if industry != "" && !model.ValidDictString(model.IndustryOptions, industry) {
		return 0, apperr.BadRequest.With("行业选项不合法")
	}
	if size != "" && !model.ValidDictString(model.SizeOptions, size) {
		return 0, apperr.BadRequest.With("公司规模选项不合法")
	}
	if funding != "" && !model.ValidDictString(model.FundingOptions, funding) {
		return 0, apperr.BadRequest.With("融资阶段选项不合法")
	}
	if restType == 0 {
		restType = model.RestTypeUnset
	}
	if restType != model.RestTypeDouble && restType != model.RestTypeSingle && restType != model.RestTypeUnset {
		return 0, apperr.BadRequest.With("休息制度选项不合法")
	}
	return restType, nil
}

// GetOrCreate 按企业名称全局唯一：谁先创建都归大家共用（公司主体=点评主体）。
func (s *CompanyService) GetOrCreate(uid int64, in CompanyInput) (*model.Company, bool, error) {
	name := strings.TrimSpace(in.Name)
	if n := len([]rune(name)); n < 2 || n > 64 {
		return nil, false, apperr.BadRequest.With("企业名称需 2-64 个字")
	}
	restType, err := validateCompanyFields(strings.TrimSpace(in.Industry), strings.TrimSpace(in.Size), strings.TrimSpace(in.Funding), in.RestType)
	if err != nil {
		return nil, false, err
	}
	var c model.Company
	if err := s.db.Where("name = ?", name).First(&c).Error; err == nil {
		// 已有主体：补录缺失的统一社会信用代码（招聘按信用代码关联的落点）
		if code := strings.TrimSpace(in.CreditCode); code != "" && c.CreditCode == "" {
			if err := s.db.Model(&c).Update("credit_code", code).Error; err == nil {
				c.CreditCode = code
			}
		}
		return &c, false, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, err
	}
	c = model.Company{
		Name: name, Logo: strings.TrimSpace(in.Logo),
		Industry: strings.TrimSpace(in.Industry), Size: strings.TrimSpace(in.Size),
		Funding: strings.TrimSpace(in.Funding), RestType: restType, CreatedBy: uid,
		CreditCode: strings.TrimSpace(in.CreditCode),
	}
	if err := s.db.Create(&c).Error; err != nil {
		// 并发创建唯一键冲突时回读
		if e2 := s.db.Where("name = ?", name).First(&c).Error; e2 == nil {
			return &c, false, nil
		}
		return nil, false, err
	}
	return &c, true, nil
}

func (s *CompanyService) listOrder(sort string) string {
	switch sort {
	case "rating_desc":
		return "CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE -1 END DESC, id DESC"
	case "rating_asc":
		return "CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE 9999 END ASC, id DESC"
	case "count_desc":
		return "rating_count DESC, id DESC"
	case "count_asc":
		return "rating_count ASC, id DESC"
	default:
		return "id DESC"
	}
}

// topReviews 批量取每家公司点赞最多的评价。
func (s *CompanyService) topReviews(ids []int64, viewer int64) map[int64]*ReviewView {
	res := make(map[int64]*ReviewView)
	if len(ids) == 0 {
		return res
	}
	var reviews []model.Review
	s.db.Where("company_id IN ? AND status = ?", ids, model.PostNormal).
		Order("like_count DESC, id DESC").Limit(len(ids)*20 + 50).Find(&reviews)
	firstID := make([]int64, 0)
	seen := make(map[int64]struct{})
	for i := range reviews {
		if _, ok := seen[reviews[i].CompanyID]; ok {
			continue
		}
		seen[reviews[i].CompanyID] = struct{}{}
		firstID = append(firstID, reviews[i].ID)
	}
	if len(firstID) == 0 {
		return res
	}
	var top []model.Review
	s.db.Where("id IN ?", firstID).Find(&top)
	ids2 := make([]int64, 0, len(top))
	for i := range top {
		ids2 = append(ids2, top[i].UserID)
	}
	briefs := loadUserBriefs(s.db, ids2)
	liked := loadLiked(s.db, viewer, model.LikeReview, firstID)
	for i := range top {
		r := &top[i]
		rv := &ReviewView{
			ID: r.ID, CompanyID: r.CompanyID,
			User: briefs[r.UserID], Overall: r.Overall, Dims: parseDims(r.Dims),
			Content: r.Content, LikeCount: r.LikeCount, Liked: liked[r.ID], CreatedAt: r.CreatedAt,
		}
		res[r.CompanyID] = rv
	}
	return res
}

func (s *CompanyService) List(kw, sort string, viewer int64, page httputil.PageQuery) (httputil.PageResult[CompanyView], error) {
	q := s.db.Model(&model.Company{})
	if kw = strings.TrimSpace(kw); kw != "" {
		q = q.Where("name LIKE ?", "%"+kw+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CompanyView]{}, err
	}
	var cs []model.Company
	if err := q.Order(s.listOrder(sort)).Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CompanyView]{}, err
	}
	ids := make([]int64, 0, len(cs))
	for i := range cs {
		ids = append(ids, cs[i].ID)
	}
	tops := s.topReviews(ids, viewer)
	list := make([]CompanyView, 0, len(cs))
	for i := range cs {
		v := companyView(&cs[i])
		if tr, ok := tops[cs[i].ID]; ok {
			v.TopReview = tr
		}
		list = append(list, v)
	}
	return httputil.PageOf(list, total, page), nil
}

func (s *CompanyService) Detail(id, viewer int64) (*CompanyView, error) {
	var c model.Company
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, apperr.NotFound.With("企业不存在")
	}
	v := companyView(&c)
	if tops := s.topReviews([]int64{id}, viewer); len(tops) > 0 {
		v.TopReview = tops[id]
	}
	return &v, nil
}

// creditCodeRe 统一社会信用代码：18 位数字与大写字母（不含 I/O/S/V/Z）。
var creditCodeRe = regexp.MustCompile(`^[0-9A-HJ-NPQRTUWXY]{18}$`)

type CompanyAdminInput struct {
	Logo        *string `json:"logo"`
	Industry    *string `json:"industry"`
	Size        *string `json:"size"`
	Funding     *string `json:"funding"`
	RestType    *int    `json:"rest_type"`
	CreditCode  *string `json:"credit_code"`
	LegalPerson *string `json:"legal_person"`
	RegCapital  *string `json:"reg_capital"`
	PaidCapital *string `json:"paid_capital"`
	InsuredCnt  *int    `json:"insured_cnt"`
	FoundedOn   *string `json:"founded_on"`
	MainBiz     *string `json:"main_biz"`
}

// AdminUpdate 仅运营管理员可维护公司资料。
func (s *CompanyService) AdminUpdate(id int64, in CompanyAdminInput) (*CompanyView, error) {
	var c model.Company
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, apperr.NotFound.With("企业不存在")
	}
	updates := map[string]any{}
	if in.Logo != nil {
		updates["logo"] = strings.TrimSpace(*in.Logo)
	}
	if in.Industry != nil {
		if v := strings.TrimSpace(*in.Industry); v != "" && !model.ValidDictString(model.IndustryOptions, v) {
			return nil, apperr.BadRequest.With("行业选项不合法")
		} else if v == "" {
			updates["industry"] = ""
		} else {
			updates["industry"] = v
		}
	}
	if in.Size != nil {
		v := strings.TrimSpace(*in.Size)
		if v != "" && !model.ValidDictString(model.SizeOptions, v) {
			return nil, apperr.BadRequest.With("公司规模选项不合法")
		}
		updates["size"] = v
	}
	if in.Funding != nil {
		v := strings.TrimSpace(*in.Funding)
		if v != "" && !model.ValidDictString(model.FundingOptions, v) {
			return nil, apperr.BadRequest.With("融资阶段选项不合法")
		}
		updates["funding"] = v
	}
	if in.RestType != nil {
		rt, err := validateCompanyFields("", "", "", *in.RestType)
		if err != nil {
			return nil, err
		}
		updates["rest_type"] = rt
	}
	if in.CreditCode != nil {
		code := strings.ToUpper(strings.TrimSpace(*in.CreditCode))
		if code != "" {
			if !creditCodeRe.MatchString(code) {
				return nil, apperr.BadRequest.With("统一社会信用代码格式不正确（18 位）")
			}
			var dup int64
			s.db.Model(&model.Company{}).Where("credit_code = ? AND id <> ?", code, id).Count(&dup)
			if dup > 0 {
				return nil, apperr.Conflict.With("该统一社会信用代码已被其他企业使用")
			}
		}
		updates["credit_code"] = code
	}
	if in.LegalPerson != nil {
		updates["legal_person"] = strings.TrimSpace(*in.LegalPerson)
	}
	if in.RegCapital != nil {
		updates["reg_capital"] = strings.TrimSpace(*in.RegCapital)
	}
	if in.PaidCapital != nil {
		updates["paid_capital"] = strings.TrimSpace(*in.PaidCapital)
	}
	if in.InsuredCnt != nil {
		if *in.InsuredCnt < 0 {
			return nil, apperr.BadRequest.With("参保人数不合法")
		}
		updates["insured_cnt"] = *in.InsuredCnt
	}
	if in.FoundedOn != nil {
		updates["founded_on"] = strings.TrimSpace(*in.FoundedOn)
	}
	if in.MainBiz != nil {
		if n := len([]rune(strings.TrimSpace(*in.MainBiz))); n > 500 {
			return nil, apperr.BadRequest.With("主营业务最多 500 字")
		}
		updates["main_biz"] = strings.TrimSpace(*in.MainBiz)
	}
	if len(updates) > 0 {
		if err := s.db.Model(&c).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	v := companyView(&c)
	return &v, nil
}

type ReviewInput struct {
	Overall int            `json:"overall" binding:"required"`
	Dims    map[string]int `json:"dims"`
	Content string         `json:"content" binding:"required"`
}

// CreateReview 对企业评分并发表评价（1-5 分 + 评分点）。
func (s *CompanyService) CreateReview(uid, companyID int64, in ReviewInput) (*ReviewView, error) {
	var c model.Company
	if err := s.db.First(&c, companyID).Error; err != nil {
		return nil, apperr.NotFound.With("企业不存在")
	}
	if in.Overall < 1 || in.Overall > 5 {
		return nil, apperr.BadRequest.With("评分需 1-5 分")
	}
	content := strings.TrimSpace(in.Content)
	if n := len([]rune(content)); n < 1 || n > 1000 {
		return nil, apperr.BadRequest.With("评价内容需 1-1000 字")
	}
	cleanDims := make(map[string]int, len(in.Dims))
	for k, v := range in.Dims {
		known := false
		for _, d := range model.ReviewDims {
			if d.Key == k {
				known = true
				break
			}
		}
		if !known || v < 1 || v > 5 {
			return nil, apperr.BadRequest.With("评分点取值不合法")
		}
		cleanDims[k] = v
	}
	dimsJSON, _ := json.Marshal(cleanDims)
	if string(dimsJSON) == "{}" {
		dimsJSON = nil
	}
	r := &model.Review{
		CompanyID: companyID, UserID: uid, Overall: in.Overall,
		Dims: string(dimsJSON), Content: content,
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(r).Error; err != nil {
			return err
		}
		return tx.Model(&model.Company{}).Where("id = ?", companyID).Updates(map[string]any{
			"rating_sum":   gorm.Expr("rating_sum + ?", in.Overall),
			"rating_count": gorm.Expr("rating_count + 1"),
			"review_count": gorm.Expr("review_count + 1"),
		}).Error
	})
	if err != nil {
		return nil, err
	}
	briefs := loadUserBriefs(s.db, []int64{uid})
	return &ReviewView{
		ID: r.ID, CompanyID: r.CompanyID, User: briefs[uid],
		Overall: r.Overall, Dims: parseDims(r.Dims), Content: r.Content,
		LikeCount: 0, Liked: false, CreatedAt: r.CreatedAt,
	}, nil
}

func (s *CompanyService) ListReviews(companyID int64, sort string, viewer int64, page httputil.PageQuery) (httputil.PageResult[ReviewView], error) {
	q := s.db.Model(&model.Review{}).Where("company_id = ? AND status = ?", companyID, model.PostNormal)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[ReviewView]{}, err
	}
	order := "id DESC"
	if sort == "likes" {
		order = "like_count DESC, id DESC"
	}
	var rs []model.Review
	if err := q.Order(order).Offset(page.Offset()).Limit(page.PageSize).Find(&rs).Error; err != nil {
		return httputil.PageResult[ReviewView]{}, err
	}
	ids := make([]int64, 0, len(rs))
	for i := range rs {
		ids = append(ids, rs[i].ID)
	}
	briefs := loadUserBriefs(s.db, userIDsOf(rs, func(r model.Review) int64 { return r.UserID }))
	liked := loadLiked(s.db, viewer, model.LikeReview, ids)
	list := make([]ReviewView, 0, len(rs))
	for i := range rs {
		list = append(list, ReviewView{
			ID: rs[i].ID, CompanyID: rs[i].CompanyID, User: briefs[rs[i].UserID],
			Overall: rs[i].Overall, Dims: parseDims(rs[i].Dims), Content: rs[i].Content,
			LikeCount: rs[i].LikeCount, Liked: liked[rs[i].ID], CreatedAt: rs[i].CreatedAt,
		})
	}
	return httputil.PageOf(list, total, page), nil
}

func userIDsOf[T any](items []T, get func(T) int64) []int64 {
	ids := make([]int64, 0, len(items))
	for _, it := range items {
		ids = append(ids, get(it))
	}
	return ids
}

// AdminDeleteReview 运营删除评价（同步修正公司评分聚合）。
func (s *CompanyService) AdminDeleteReview(id int64) error {
	var r model.Review
	if err := s.db.First(&r, id).Error; err != nil {
		return apperr.NotFound.With("评价不存在")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&r).Error; err != nil {
			return err
		}
		return tx.Model(&model.Company{}).Where("id = ?", r.CompanyID).Updates(map[string]any{
			"rating_sum":   gorm.Expr("GREATEST(rating_sum - ?, 0)", r.Overall),
			"rating_count": gorm.Expr("GREATEST(rating_count - 1, 0)"),
			"review_count": gorm.Expr("GREATEST(review_count - 1, 0)"),
		}).Error
	})
}

// AdminListReviewView 管理端评价列表视图。
type AdminReviewView struct {
	ID          int64          `json:"id"`
	CompanyID   int64          `json:"company_id"`
	CompanyName string         `json:"company_name"`
	User        UserBrief      `json:"user"`
	Overall     int            `json:"overall"`
	Dims        map[string]int `json:"dims"`
	Content     string         `json:"content"`
	LikeCount   int            `json:"like_count"`
	Status      int            `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
}

func (s *CompanyService) AdminListReviews(kw string, status int, page httputil.PageQuery) (httputil.PageResult[AdminReviewView], error) {
	q := s.db.Model(&model.Review{})
	if kw = strings.TrimSpace(kw); kw != "" {
		q = q.Where("content LIKE ?", "%"+kw+"%")
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[AdminReviewView]{}, err
	}
	var rs []model.Review
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&rs).Error; err != nil {
		return httputil.PageResult[AdminReviewView]{}, err
	}
	compIDs := make([]int64, 0, len(rs))
	userIDs := make([]int64, 0, len(rs))
	for i := range rs {
		compIDs = append(compIDs, rs[i].CompanyID)
		userIDs = append(userIDs, rs[i].UserID)
	}
	comps := loadCompanies(s.db, compIDs)
	briefs := loadUserBriefs(s.db, userIDs)
	list := make([]AdminReviewView, 0, len(rs))
	for i := range rs {
		name := ""
		if c, ok := comps[rs[i].CompanyID]; ok {
			name = c.Name
		}
		list = append(list, AdminReviewView{
			ID: rs[i].ID, CompanyID: rs[i].CompanyID, CompanyName: name,
			User: briefs[rs[i].UserID], Overall: rs[i].Overall, Dims: parseDims(rs[i].Dims),
			Content: rs[i].Content, LikeCount: rs[i].LikeCount, Status: rs[i].Status,
			CreatedAt: rs[i].CreatedAt,
		})
	}
	return httputil.PageOf(list, total, page), nil
}

// AdminList 管理端公司列表。
func (s *CompanyService) AdminList(kw string, page httputil.PageQuery) (httputil.PageResult[CompanyView], error) {
	q := s.db.Model(&model.Company{})
	if kw = strings.TrimSpace(kw); kw != "" {
		q = q.Where("name LIKE ?", "%"+kw+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CompanyView]{}, err
	}
	var cs []model.Company
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CompanyView]{}, err
	}
	list := make([]CompanyView, 0, len(cs))
	for i := range cs {
		list = append(list, companyView(&cs[i]))
	}
	return httputil.PageOf(list, total, page), nil
}

// AdminHideReview / AdminRestoreReview 运营隐藏/恢复评价（计数不变）。
func (s *CompanyService) AdminHideReview(id int64) error {
	return s.db.Model(&model.Review{}).Where("id = ?", id).Update("status", model.PostHidden).Error
}

func (s *CompanyService) AdminRestoreReview(id int64) error {
	return s.db.Model(&model.Review{}).Where("id = ?", id).Update("status", model.PostNormal).Error
}
