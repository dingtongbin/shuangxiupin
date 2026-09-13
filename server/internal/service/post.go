package service

import (
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

type PostService struct {
	db     *gorm.DB
	notify *NotifyService
}

func NewPost(db *gorm.DB, notify *NotifyService) *PostService {
	return &PostService{db: db, notify: notify}
}

type PostInput struct {
	Content         string `json:"content" binding:"required"`
	RepostOfID      int64  `json:"repost_of_id"`
	RepostCommentID int64  `json:"repost_comment_id"`
}

// Create 发布问答；repost_of_id>0 转发原问答，repost_comment_id>0 转发某条回答。
func (s *PostService) Create(uid int64, in PostInput) (*PostView, error) {
	content := strings.TrimSpace(in.Content)
	if n := len([]rune(content)); n < 1 || n > 2000 {
		return nil, apperr.BadRequest.With("求助内容需 1-2000 字")
	}
	var orig *model.Post
	if in.RepostOfID > 0 {
		orig = &model.Post{}
		if err := s.db.Where("id = ? AND status = ?", in.RepostOfID, model.PostNormal).First(orig).Error; err != nil {
			return nil, apperr.NotFound.With("原问答不存在或已删除")
		}
	}
	var origComment *model.Comment
	if in.RepostCommentID > 0 {
		origComment = &model.Comment{}
		if err := s.db.Where("id = ? AND parent_id = 0 AND status = ?", in.RepostCommentID, model.PostNormal).
			First(origComment).Error; err != nil {
			return nil, apperr.NotFound.With("回答不存在或已删除")
		}
	}
	p := &model.Post{UserID: uid, Content: content, RepostOfID: in.RepostOfID, RepostCommentID: in.RepostCommentID}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(p).Error; err != nil {
			return err
		}
		if orig != nil {
			if err := tx.Model(&model.Post{}).Where("id = ?", orig.ID).
				Update("repost_count", gorm.Expr("repost_count + 1")).Error; err != nil {
				return err
			}
		}
		if origComment != nil {
			return tx.Model(&model.Comment{}).Where("id = ?", origComment.ID).
				Update("repost_count", gorm.Expr("repost_count + 1")).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if orig != nil {
		s.notify.Send(orig.UserID, model.NotifyRepost, uid, "转发了你的问答", orig.ID, 0)
	}
	if origComment != nil {
		s.notify.Send(origComment.UserID, model.NotifyRepost, uid, "转发了你的回答", origComment.PostID, 0)
	}
	views := s.enrich([]model.Post{*p}, uid)
	return &views[0], nil
}

// Feed 广场帖子流：latest 全部最新 / follow 关注的人。
func (s *PostService) Feed(tab string, viewer int64, page httputil.PageQuery) (httputil.PageResult[PostView], error) {
	dbq := s.db.Model(&model.Post{}).Where("status = ?", model.PostNormal)
	if tab == "follow" {
		var fids []int64
		s.db.Model(&model.Follow{}).Where("follower_id = ?", viewer).Pluck("followee_id", &fids)
		if len(fids) == 0 {
			return httputil.PageOf([]PostView{}, 0, page), nil
		}
		dbq = dbq.Where("user_id IN ?", fids)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	var posts []model.Post
	if err := dbq.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&posts).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	return httputil.PageOf(s.enrich(posts, viewer), total, page), nil
}

// ListByUser 用户主页/我的转发列表；kind=repost 仅转发，kind=post 仅原创问答。
func (s *PostService) ListByUser(uid int64, viewer int64, kind string, page httputil.PageQuery) (httputil.PageResult[PostView], error) {
	q := s.db.Model(&model.Post{}).Where("user_id = ? AND status = ?", uid, model.PostNormal)
	switch kind {
	case "repost":
		q = q.Where("repost_of_id > 0 OR repost_comment_id > 0")
	case "post":
		q = q.Where("repost_of_id = 0 AND repost_comment_id = 0")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	var posts []model.Post
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&posts).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	return httputil.PageOf(s.enrich(posts, viewer), total, page), nil
}

// Search 关键词搜索帖子。
func (s *PostService) Search(kw string, viewer int64, page httputil.PageQuery) (httputil.PageResult[PostView], error) {
	dbq := s.db.Model(&model.Post{}).Where("status = ?", model.PostNormal)
	if kw = strings.TrimSpace(kw); kw != "" {
		dbq = dbq.Where("content LIKE ?", "%"+kw+"%")
	} else {
		return httputil.PageOf([]PostView{}, 0, page), nil
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	var posts []model.Post
	if err := dbq.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&posts).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	return httputil.PageOf(s.enrich(posts, viewer), total, page), nil
}

func (s *PostService) Detail(id, viewer int64) (*PostView, error) {
	var p model.Post
	if err := s.db.Where("id = ? AND status = ?", id, model.PostNormal).First(&p).Error; err != nil {
		return nil, apperr.NotFound.With("帖子不存在或已删除")
	}
	views := s.enrich([]model.Post{p}, viewer)
	return &views[0], nil
}

func (s *PostService) Delete(uid, id int64) error {
	var p model.Post
	if err := s.db.First(&p, id).Error; err != nil {
		return apperr.NotFound.With("帖子不存在或已删除")
	}
	if p.UserID != uid {
		return apperr.Forbidden.With("只能删除自己的帖子")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&p).Error; err != nil {
			return err
		}
		if p.RepostOfID > 0 {
			return tx.Model(&model.Post{}).Where("id = ?", p.RepostOfID).
				Update("repost_count", gorm.Expr("GREATEST(repost_count - 1, 0)")).Error
		}
		return nil
	})
}

// ---------- 运营管理（隐藏/恢复/删除） ----------

func (s *PostService) AdminHide(id int64) error {
	return s.db.Model(&model.Post{}).Where("id = ?", id).Update("status", model.PostHidden).Error
}

func (s *PostService) AdminRestore(id int64) error {
	return s.db.Model(&model.Post{}).Where("id = ?", id).Update("status", model.PostNormal).Error
}

func (s *PostService) AdminDelete(id int64) error {
	var p model.Post
	if err := s.db.First(&p, id).Error; err != nil {
		return apperr.NotFound.With("帖子不存在")
	}
	return s.db.Delete(&p).Error
}

func (s *PostService) AdminList(kw string, status int, page httputil.PageQuery) (httputil.PageResult[PostView], error) {
	dbq := s.db.Model(&model.Post{})
	if kw = strings.TrimSpace(kw); kw != "" {
		dbq = dbq.Where("content LIKE ?", "%"+kw+"%")
	}
	if status > 0 {
		dbq = dbq.Where("status = ?", status)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	var posts []model.Post
	if err := dbq.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&posts).Error; err != nil {
		return httputil.PageResult[PostView]{}, err
	}
	return httputil.PageOf(s.enrich(posts, 0), total, page), nil
}

// ---------- 装配 ----------

func (s *PostService) enrich(posts []model.Post, viewer int64) []PostView {
	if len(posts) == 0 {
		return []PostView{}
	}
	userIDs := make([]int64, 0, len(posts))
	ids := make([]int64, 0, len(posts))
	repostIDs := make([]int64, 0)
	for i := range posts {
		userIDs = append(userIDs, posts[i].UserID)
		ids = append(ids, posts[i].ID)
		if posts[i].RepostOfID > 0 {
			repostIDs = append(repostIDs, posts[i].RepostOfID)
		}
	}
	briefs := loadUserBriefs(s.db, userIDs)
	liked := loadLiked(s.db, viewer, model.LikePost, ids)
	// 转发引用（原帖可能已被删除，用 Unscoped 拿昵称）
	origMap := make(map[int64]*model.Post)
	if len(repostIDs) > 0 {
		var origs []model.Post
		s.db.Unscoped().Where("id IN ?", repostIDs).Find(&origs)
		for i := range origs {
			origMap[origs[i].ID] = &origs[i]
		}
	}
	origBriefs := loadUserBriefs(s.db, func() []int64 {
		out := make([]int64, 0, len(origMap))
		for _, p := range origMap {
			out = append(out, p.UserID)
		}
		return out
	}())
	list := make([]PostView, 0, len(posts))
	for i := range posts {
		p := &posts[i]
		v := PostView{
			ID: p.ID, User: briefs[p.UserID], Content: p.Content,
			RepostOfID: p.RepostOfID,
			LikeCount:  p.LikeCount, CommentCount: p.CommentCount, RepostCount: p.RepostCount,
			Liked: liked[p.ID], Status: p.Status, CreatedAt: p.CreatedAt,
		}
		if p.RepostOfID > 0 {
			if orig, ok := origMap[p.RepostOfID]; ok && !orig.DeletedAt.Valid && orig.Status == model.PostNormal {
				ref := &RepostRef{
					ID:       orig.ID,
					Nickname: origBriefs[orig.UserID].Nickname,
					Content:  truncateRunes(orig.Content, 120),
				}
				v.RepostOf = ref
			} else {
				v.RepostOf = &RepostRef{ID: p.RepostOfID, Nickname: "", Content: "原帖已删除"}
			}
		}
		if p.RepostCommentID > 0 {
			var c model.Comment
			if err := s.db.Select("id", "post_id", "user_id", "content", "status").
				First(&c, p.RepostCommentID).Error; err == nil && c.Status == model.PostNormal {
				b := loadUserBriefs(s.db, []int64{c.UserID})[c.UserID]
				v.RepostComment = &RepostAnswerRef{
					ID: c.ID, PostID: c.PostID,
					Nickname: b.Nickname, Content: truncateRunes(c.Content, 120),
				}
			}
		}
		list = append(list, v)
	}
	return list
}

func truncateRunes(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= n {
		return strings.TrimSpace(s)
	}
	return string(r[:n]) + "…"
}
