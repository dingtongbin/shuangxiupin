package service

import (
	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/apperr"
	"github.com/shuangxiupin/server/internal/model"
)

// InteractionService 点赞（帖子/评论/评价）与关注。
type InteractionService struct {
	db     *gorm.DB
	notify *NotifyService
}

func NewInteraction(db *gorm.DB, notify *NotifyService) *InteractionService {
	return &InteractionService{db: db, notify: notify}
}

type likeTarget struct {
	ownerID   int64
	table     string
	postID    int64
	companyID int64
	verb      string
}

func (s *InteractionService) resolveTarget(targetType int, targetID int64) (*likeTarget, error) {
	switch targetType {
	case model.LikePost:
		var p model.Post
		if err := s.db.First(&p, targetID).Error; err != nil {
			return nil, apperr.NotFound.With("帖子不存在或已删除")
		}
		return &likeTarget{ownerID: p.UserID, table: "posts", postID: p.ID, verb: "赞了你的帖子"}, nil
	case model.LikeComment:
		var c model.Comment
		if err := s.db.First(&c, targetID).Error; err != nil {
			return nil, apperr.NotFound.With("评论不存在或已删除")
		}
		return &likeTarget{ownerID: c.UserID, table: "comments", postID: c.PostID, verb: "赞了你的回答"}, nil
	case model.LikeReview:
		var r model.Review
		if err := s.db.First(&r, targetID).Error; err != nil {
			return nil, apperr.NotFound.With("评价不存在或已删除")
		}
		return &likeTarget{ownerID: r.UserID, table: "reviews", companyID: r.CompanyID, verb: "赞了你的评价"}, nil
	}
	return nil, apperr.BadRequest.With("点赞对象不合法")
}

func (s *InteractionService) counterColumn(targetType int) string {
	switch targetType {
	case model.LikePost, model.LikeComment, model.LikeReview:
		return "like_count"
	}
	return ""
}

// ToggleLike 点赞/取消，返回最新状态与计数。
func (s *InteractionService) ToggleLike(uid int64, targetType int, targetID int64) (bool, int, error) {
	t, err := s.resolveTarget(targetType, targetID)
	if err != nil {
		return false, 0, err
	}
	var existing model.Like
	findErr := s.db.Where("user_id = ? AND target_type = ? AND target_id = ?", uid, targetType, targetID).
		First(&existing).Error
	col := s.counterColumn(targetType)
	if findErr == nil {
		err := s.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Delete(&existing).Error; err != nil {
				return err
			}
			return tx.Table(t.table).Where("id = ?", targetID).
				Update(col, gorm.Expr("GREATEST("+col+" - 1, 0)")).Error
		})
		if err != nil {
			return false, 0, err
		}
		return false, 0, nil
	}
	like := &model.Like{UserID: uid, TargetType: targetType, TargetID: targetID}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(like).Error; err != nil {
			return err
		}
		return tx.Table(t.table).Where("id = ?", targetID).
			Update(col, gorm.Expr(col+" + 1")).Error
	})
	if err != nil {
		return false, 0, err
	}
	s.notify.Send(t.ownerID, model.NotifyLike, uid, t.verb, t.postID, t.companyID)
	return true, 1, nil
}

// ToggleFavorite 收藏/取消（回答 / 职位），返回最新状态与计数。
func (s *InteractionService) ToggleFavorite(uid int64, targetType int, targetID int64) (bool, int, error) {
	switch targetType {
	case model.LikeComment:
		return s.toggleFavComment(uid, targetID)
	case model.TargetJob:
		return s.toggleFavJob(uid, targetID)
	}
	return false, 0, apperr.BadRequest.With("该内容暂不支持收藏")
}

func (s *InteractionService) toggleFavComment(uid, targetID int64) (bool, int, error) {
	var c model.Comment
	if err := s.db.First(&c, targetID).Error; err != nil {
		return false, 0, apperr.NotFound.With("回答不存在或已删除")
	}
	var existing model.Favorite
	findErr := s.db.Where("user_id = ? AND target_type = ? AND target_id = ?", uid, model.LikeComment, targetID).
		First(&existing).Error
	if findErr == nil {
		err := s.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Delete(&existing).Error; err != nil {
				return err
			}
			return tx.Model(&model.Comment{}).Where("id = ?", targetID).
				Update("fav_count", gorm.Expr("GREATEST(fav_count - 1, 0)")).Error
		})
		if err != nil {
			return false, 0, err
		}
		return false, s.favCount(model.LikeComment, targetID), nil
	}
	fav := &model.Favorite{UserID: uid, TargetType: model.LikeComment, TargetID: targetID}
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(fav).Error; err != nil {
			return err
		}
		return tx.Model(&model.Comment{}).Where("id = ?", targetID).
			Update("fav_count", gorm.Expr("fav_count + 1")).Error
	}); err != nil {
		return false, 0, err
	}
	s.notify.Send(c.UserID, model.NotifyLike, uid, "收藏了你的回答", c.PostID, 0)
	return true, s.favCount(model.LikeComment, targetID), nil
}

func (s *InteractionService) toggleFavJob(uid, targetID int64) (bool, int, error) {
	var j model.Job
	if err := s.db.First(&j, targetID).Error; err != nil {
		return false, 0, apperr.NotFound.With("职位不存在或已下架")
	}
	var existing model.Favorite
	findErr := s.db.Where("user_id = ? AND target_type = ? AND target_id = ?", uid, model.TargetJob, targetID).
		First(&existing).Error
	if findErr == nil {
		if err := s.db.Delete(&existing).Error; err != nil {
			return false, 0, err
		}
		return false, s.favCount(model.TargetJob, targetID), nil
	}
	fav := &model.Favorite{UserID: uid, TargetType: model.TargetJob, TargetID: targetID}
	if err := s.db.Create(fav).Error; err != nil {
		return false, 0, err
	}
	return true, s.favCount(model.TargetJob, targetID), nil
}

func (s *InteractionService) favCount(targetType int, targetID int64) int {
	var cnt int64
	s.db.Model(&model.Favorite{}).
		Where("target_type = ? AND target_id = ?", targetType, targetID).Count(&cnt)
	return int(cnt)
}

// ToggleFollow 关注/取关。
func (s *InteractionService) ToggleFollow(viewer, target int64) (bool, error) {
	if viewer == target {
		return false, apperr.BadRequest.With("不能关注自己")
	}
	var u model.User
	if err := s.db.First(&u, target).Error; err != nil {
		return false, apperr.NotFound.With("用户不存在")
	}
	var existing model.Follow
	findErr := s.db.Where("follower_id = ? AND followee_id = ?", viewer, target).First(&existing).Error
	if findErr == nil {
		return false, s.db.Delete(&existing).Error
	}
	f := &model.Follow{FollowerID: viewer, FolloweeID: target}
	if err := s.db.Create(f).Error; err != nil {
		return false, err
	}
	s.notify.Send(target, model.NotifyFollow, viewer, "关注了你", 0, 0)
	return true, nil
}

func (s *InteractionService) IsFollowing(viewer, target int64) bool {
	var cnt int64
	s.db.Model(&model.Follow{}).
		Where("follower_id = ? AND followee_id = ?", viewer, target).Count(&cnt)
	return cnt > 0
}
