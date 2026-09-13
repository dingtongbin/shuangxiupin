// Package session Redis 会话管理器：会话数据完全存 Redis（不落 MySQL），
// Cookie 仅携带不透明的随机 SID，TTL 滑动续期。
package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type Data struct {
	UserID        int64 `json:"uid"`
	Role          int   `json:"role"`
	MustChangePWD bool  `json:"mcp"`
}

type Manager struct {
	rdb    *redis.Client
	name   string
	ttl    time.Duration
	secure bool
	domain string
}

func New(rdb *redis.Client, name string, ttlHours int, secure bool, domain string) *Manager {
	if name == "" {
		name = "sxu_session"
	}
	if ttlHours <= 0 {
		ttlHours = 168
	}
	return &Manager{
		rdb:    rdb,
		name:   name,
		ttl:    time.Duration(ttlHours) * time.Hour,
		secure: secure,
		domain: domain,
	}
}

func (m *Manager) key(sid string) string    { return "sxu:sess:" + sid }
func (m *Manager) userKey(uid int64) string { return fmt.Sprintf("sxu:sess:u:%d", uid) }

func randToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (m *Manager) Create(c *gin.Context, d Data) error {
	sid := randToken()
	b, err := json.Marshal(d)
	if err != nil {
		return err
	}
	ctx := context.Background()
	pipe := m.rdb.TxPipeline()
	pipe.Set(ctx, m.key(sid), b, m.ttl)
	pipe.SAdd(ctx, m.userKey(d.UserID), sid)
	pipe.Expire(ctx, m.userKey(d.UserID), m.ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return err
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     m.name,
		Value:    sid,
		Path:     "/",
		MaxAge:   int(m.ttl.Seconds()),
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: http.SameSiteLaxMode,
		Domain:   m.domain,
	})
	return nil
}

func (m *Manager) Get(c *gin.Context) (*Data, bool) {
	ck, err := c.Request.Cookie(m.name)
	if err != nil || ck.Value == "" {
		return nil, false
	}
	ctx := context.Background()
	raw, err := m.rdb.Get(ctx, m.key(ck.Value)).Bytes()
	if err != nil {
		return nil, false
	}
	var d Data
	if err := json.Unmarshal(raw, &d); err != nil || d.UserID <= 0 {
		return nil, false
	}
	// 滑动续期
	m.rdb.Expire(ctx, m.key(ck.Value), m.ttl)
	m.rdb.Expire(ctx, m.userKey(d.UserID), m.ttl)
	return &d, true
}

func (m *Manager) Destroy(c *gin.Context) {
	if ck, err := c.Request.Cookie(m.name); err == nil && ck.Value != "" {
		ctx := context.Background()
		if raw, err := m.rdb.Get(ctx, m.key(ck.Value)).Result(); err == nil {
			var d Data
			if json.Unmarshal([]byte(raw), &d) == nil && d.UserID > 0 {
				m.rdb.SRem(ctx, m.userKey(d.UserID), ck.Value)
			}
		}
		m.rdb.Del(ctx, m.key(ck.Value))
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name: m.name, Value: "", Path: "/", MaxAge: -1, HttpOnly: true,
		Secure: m.secure, SameSite: http.SameSiteLaxMode, Domain: m.domain,
	})
}

// Rotate 用新会话替换当前会话（改密/角色变更后刷新会话数据，
// 只下发一次 Set-Cookie，旧会话立即失效）。
func (m *Manager) Rotate(c *gin.Context, d Data) error {
	if ck, err := c.Request.Cookie(m.name); err == nil && ck.Value != "" {
		ctx := context.Background()
		if raw, err := m.rdb.Get(ctx, m.key(ck.Value)).Bytes(); err == nil {
			var old Data
			if json.Unmarshal(raw, &old) == nil && old.UserID > 0 {
				m.rdb.SRem(ctx, m.userKey(old.UserID), ck.Value)
			}
		}
		m.rdb.Del(ctx, m.key(ck.Value))
	}
	return m.Create(c, d)
}

// DestroyUser 立即下线某用户全部会话（封禁/角色变更/重置密码时调用）。
func (m *Manager) DestroyUser(ctx context.Context, uid int64) {
	sids, err := m.rdb.SMembers(ctx, m.userKey(uid)).Result()
	if err == nil {
		for _, sid := range sids {
			m.rdb.Del(ctx, m.key(sid))
		}
	}
	m.rdb.Del(ctx, m.userKey(uid))
}
