package service

import (
	"log/slog"

	"gorm.io/gorm"

	"github.com/shuangxiupin/server/internal/httputil"
	"github.com/shuangxiupin/server/internal/model"
	"github.com/shuangxiupin/server/internal/ws"
)

// Notifier 由 *ws.Hub 实现，用于实时推送。
type Notifier interface {
	Push(uid int64, v any)
}

// NotifyService 消息中心：系统消息 + 广场互动消息（无任何私信）。
type NotifyService struct {
	db  *gorm.DB
	hub Notifier
}

func NewNotify(db *gorm.DB, hub Notifier) *NotifyService {
	return &NotifyService{db: db, hub: hub}
}

func (s *NotifyService) unread(uid int64) (system, interact int64) {
	s.db.Model(&model.Notification{}).
		Where("user_id = ? AND is_read = ? AND type = ?", uid, false, model.NotifySystem).Count(&system)
	s.db.Model(&model.Notification{}).
		Where("user_id = ? AND is_read = ? AND type > ?", uid, false, model.NotifySystem).Count(&interact)
	return
}

func (s *NotifyService) pushUnread(uid int64) {
	system, interact := s.unread(uid)
	s.hub.Push(uid, map[string]any{
		"type": ws.TypeUnread,
		"data": map[string]any{"system": system, "interact": interact, "total": system + interact},
	})
}

// Send 写入通知并实时推送；sender == 接收者时不写（不自我打扰）。
func (s *NotifyService) Send(userID int64, ntype int, senderID int64, content string, postID, companyID int64) {
	if userID <= 0 || userID == senderID {
		return
	}
	n := &model.Notification{
		UserID: userID, Type: ntype, SenderID: senderID,
		PostID: postID, CompanyID: companyID, Content: content,
	}
	if err := s.db.Create(n).Error; err != nil {
		slog.Error("通知写入失败", "err", err)
		return
	}
	s.hub.Push(userID, map[string]any{
		"type": ws.TypeNotification,
		"data": map[string]any{"id": n.ID, "type": ntype, "content": content},
	})
	s.pushUnread(userID)
}

// List 消息列表：box = system | interact。
func (s *NotifyService) List(uid int64, box string, page httputil.PageQuery) (httputil.PageResult[NotificationView], error) {
	q := s.db.Model(&model.Notification{}).Where("user_id = ?", uid)
	if box == "system" {
		q = q.Where("type = ?", model.NotifySystem)
	} else {
		q = q.Where("type > ?", model.NotifySystem)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return httputil.PageResult[NotificationView]{}, err
	}
	var items []model.Notification
	if err := q.Order("id DESC").Offset(page.Offset()).Limit(page.PageSize).Find(&items).Error; err != nil {
		return httputil.PageResult[NotificationView]{}, err
	}
	ids := make([]int64, 0, len(items))
	for _, n := range items {
		if n.SenderID > 0 {
			ids = append(ids, n.SenderID)
		}
	}
	briefs := loadUserBriefs(s.db, ids)
	list := make([]NotificationView, 0, len(items))
	for _, n := range items {
		v := NotificationView{
			ID: n.ID, Type: n.Type, PostID: n.PostID, CompanyID: n.CompanyID,
			Content: n.Content, IsRead: n.IsRead, CreatedAt: n.CreatedAt,
		}
		if n.SenderID > 0 {
			if b, ok := briefs[n.SenderID]; ok {
				v.Sender = &b
			}
		}
		list = append(list, v)
	}
	return httputil.PageOf(list, total, page), nil
}

func (s *NotifyService) MarkRead(uid int64, ids []int64, all bool) error {
	q := s.db.Model(&model.Notification{}).Where("user_id = ? AND is_read = ?", uid, false)
	if !all {
		if len(ids) == 0 {
			return nil
		}
		q = q.Where("id IN ?", ids)
	}
	if err := q.Update("is_read", true).Error; err != nil {
		return err
	}
	s.pushUnread(uid)
	return nil
}

func (s *NotifyService) Unread(uid int64) (system, interact, total int64) {
	system, interact = s.unread(uid)
	return system, interact, system + interact
}

// UnreadPayload 供 WS hello/推送使用的未读数负载。
func (s *NotifyService) UnreadPayload(uid int64) map[string]any {
	system, interact := s.unread(uid)
	return map[string]any{"system": system, "interact": interact, "total": system + interact}
}
