package service

import (
	"strings"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
)

type CommentService struct {
	db     *gorm.DB
	notify *NotifyService
}

func NewComment(db *gorm.DB, notify *NotifyService) *CommentService {
	return &CommentService{db: db, notify: notify}
}

type CommentInput struct {
	Content  string `json:"content" binding:"required"`
	ParentID int64  `json:"parent_id"` // 回复目标评论/回复的 ID
}

// Create 发表评论或回复（两级）：root=顶级评论ID，replyTo=被回复人。
func (s *CommentService) Create(uid, postID int64, in CommentInput) (*CommentView, error) {
	var post model.Post
	if err := s.db.Where("id = ? AND status = ?", postID, model.PostNormal).First(&post).Error; err != nil {
		return nil, apperr.NotFound.With("帖子不存在或已删除")
	}
	content := strings.TrimSpace(in.Content)
	if n := len([]rune(content)); n < 1 || n > 500 {
		return nil, apperr.BadRequest.With("评论内容需 1-500 字")
	}
	root := int64(0)
	replyTo := int64(0)
	if in.ParentID > 0 {
		var parent model.Comment
		if err := s.db.Where("id = ? AND post_id = ? AND status = ?", in.ParentID, postID, model.PostNormal).
			First(&parent).Error; err != nil {
			return nil, apperr.NotFound.With("评论不存在或已删除")
		}
		if parent.ParentID == 0 {
			root = parent.ID
		} else {
			root = parent.ParentID
		}
		replyTo = parent.UserID
	}
	c := &model.Comment{
		PostID: postID, UserID: uid, ParentID: root, ReplyToUserID: replyTo, Content: content,
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(c).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Post{}).Where("id = ?", postID).
			Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
			return err
		}
		if root > 0 {
			return tx.Model(&model.Comment{}).Where("id = ?", root).
				Update("reply_count", gorm.Expr("reply_count + 1")).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if root > 0 {
		s.notify.Send(replyTo, model.NotifyComment, uid, "评论了你的回答", postID, 0)
	} else {
		s.notify.Send(post.UserID, model.NotifyComment, uid, "回答了你的问答", postID, 0)
	}
	views := s.enrich([]model.Comment{*c}, uid, true)
	return &views[0], nil
}

// FavoritesOf 用户收藏的回答列表。
func (s *CommentService) FavoritesOf(uid int64, page httputil.PageQuery) (httputil.PageResult[CommentView], error) {
	q := s.db.Model(&model.Favorite{}).Where("user_id = ? AND target_type = ?", uid, model.LikeComment)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	var favs []model.Favorite
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&favs).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	list := []CommentView{}
	if len(favs) > 0 {
		ids := make([]int64, 0, len(favs))
		for _, f := range favs {
			ids = append(ids, f.TargetID)
		}
		var cs []model.Comment
		if err := s.db.Where("id IN ?", ids).Find(&cs).Error; err != nil {
			return httputil.PageResult[CommentView]{}, err
		}
		byID := make(map[int64]model.Comment, len(cs))
		for i := range cs {
			byID[cs[i].ID] = cs[i]
		}
		ordered := make([]model.Comment, 0, len(ids))
		for _, id := range ids {
			if c, ok := byID[id]; ok {
				ordered = append(ordered, c)
			}
		}
		list = s.enrich(ordered, uid, false)
	}
	return httputil.PageOf(list, total, page), nil
}

// ListByUser 用户（我的）回答列表：仅顶级回答。
func (s *CommentService) ListByUser(uid int64, viewer int64, page httputil.PageQuery) (httputil.PageResult[CommentView], error) {
	q := s.db.Model(&model.Comment{}).
		Where("user_id = ? AND parent_id = 0 AND status = ?", uid, model.PostNormal)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	var cs []model.Comment
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	return httputil.PageOf(s.enrich(cs, viewer, false), total, page), nil
}

// ListTop 顶级评论：默认最新，可切点赞排序。
func (s *CommentService) ListTop(postID int64, sort string, viewer int64, page httputil.PageQuery) (httputil.PageResult[CommentView], error) {
	q := s.db.Model(&model.Comment{}).
		Where("post_id = ? AND parent_id = 0 AND status = ?", postID, model.PostNormal)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	order := "id DESC"
	if sort == "likes" {
		order = "like_count DESC, id DESC"
	}
	var cs []model.Comment
	if err := q.Order(order).Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	return httputil.PageOf(s.enrich(cs, viewer, false), total, page), nil
}

// ListReplies 回复列表：默认点赞排序（需求指定），可切最新。
func (s *CommentService) ListReplies(commentID int64, sort string, viewer int64, page httputil.PageQuery) (httputil.PageResult[CommentView], error) {
	q := s.db.Model(&model.Comment{}).
		Where("parent_id = ? AND status = ?", commentID, model.PostNormal)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	order := "like_count DESC, id DESC"
	if sort == "latest" {
		order = "id DESC"
	}
	var cs []model.Comment
	if err := q.Order(order).Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	return httputil.PageOf(s.enrich(cs, viewer, true), total, page), nil
}

func (s *CommentService) Delete(uid, id int64) error {
	var c model.Comment
	if err := s.db.First(&c, id).Error; err != nil {
		return apperr.NotFound.With("评论不存在或已删除")
	}
	if c.UserID != uid {
		return apperr.Forbidden.With("只能删除自己的评论")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&c).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Post{}).Where("id = ?", c.PostID).
			Update("comment_count", gorm.Expr("GREATEST(comment_count - 1, 0)")).Error; err != nil {
			return err
		}
		if c.ParentID > 0 {
			return tx.Model(&model.Comment{}).Where("id = ?", c.ParentID).
				Update("reply_count", gorm.Expr("GREATEST(reply_count - 1, 0)")).Error
		}
		return nil
	})
}

// ---------- 运营管理 ----------

func (s *CommentService) AdminHide(id int64) error {
	return s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", model.PostHidden).Error
}

func (s *CommentService) AdminRestore(id int64) error {
	return s.db.Model(&model.Comment{}).Where("id = ?", id).Update("status", model.PostNormal).Error
}

func (s *CommentService) AdminDelete(id int64) error {
	var c model.Comment
	if err := s.db.First(&c, id).Error; err != nil {
		return apperr.NotFound.With("评论不存在")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&c).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Post{}).Where("id = ?", c.PostID).
			Update("comment_count", gorm.Expr("GREATEST(comment_count - 1, 0)")).Error; err != nil {
			return err
		}
		if c.ParentID > 0 {
			return tx.Model(&model.Comment{}).Where("id = ?", c.ParentID).
				Update("reply_count", gorm.Expr("GREATEST(reply_count - 1, 0)")).Error
		}
		return nil
	})
}

func (s *CommentService) AdminList(kw string, status int, page httputil.PageQuery) (httputil.PageResult[CommentView], error) {
	dbq := s.db.Model(&model.Comment{})
	if kw = strings.TrimSpace(kw); kw != "" {
		dbq = dbq.Where("content LIKE ?", "%"+kw+"%")
	}
	if status > 0 {
		dbq = dbq.Where("status = ?", status)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	var cs []model.Comment
	if err := dbq.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&cs).Error; err != nil {
		return httputil.PageResult[CommentView]{}, err
	}
	return httputil.PageOf(s.enrich(cs, 0, false), total, page), nil
}

// ---------- 装配 ----------

func (s *CommentService) enrich(cs []model.Comment, viewer int64, withReplyTo bool) []CommentView {
	if len(cs) == 0 {
		return []CommentView{}
	}
	userIDs := make([]int64, 0, len(cs))
	replyToIDs := make([]int64, 0)
	ids := make([]int64, 0, len(cs))
	for i := range cs {
		userIDs = append(userIDs, cs[i].UserID)
		ids = append(ids, cs[i].ID)
		if withReplyTo && cs[i].ReplyToUserID > 0 && cs[i].ReplyToUserID != cs[i].UserID {
			replyToIDs = append(replyToIDs, cs[i].ReplyToUserID)
		}
	}
	briefs := loadUserBriefs(s.db, userIDs)
	replyBriefs := loadUserBriefs(s.db, replyToIDs)
	liked := loadLiked(s.db, viewer, model.LikeComment, ids)
	faved := loadFavorited(s.db, viewer, model.LikeComment, ids)
	list := make([]CommentView, 0, len(cs))
	for i := range cs {
		c := &cs[i]
		v := CommentView{
			ID: c.ID, PostID: c.PostID, ParentID: c.ParentID,
			User: briefs[c.UserID], ReplyToUserID: c.ReplyToUserID,
			Content: c.Content, LikeCount: c.LikeCount, ReplyCount: c.ReplyCount,
			FavCount: c.FavCount, Favorited: faved[c.ID], RepostCount: c.RepostCount,
			Liked: liked[c.ID], Status: c.Status, CreatedAt: c.CreatedAt,
		}
		if withReplyTo && c.ReplyToUserID > 0 {
			if b, ok := replyBriefs[c.ReplyToUserID]; ok {
				v.ReplyToUser = &b
			}
		}
		list = append(list, v)
	}
	return list
}
