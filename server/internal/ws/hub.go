// Package ws WebSocket Hub：每用户可有多条连接；客户端 30s 发一次 {"type":"ping"}，
// 服务端据此刷新 Redis 在线键 online:<uid>（TTL 120s），断开即删除。
package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	TypePing         = "ping"
	TypePong         = "pong"
	TypeHello        = "hello"
	TypeNotification = "notification"
	TypeUnread       = "unread"
	TypeLogout       = "logout"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = 25 * time.Second
	onlineTTL  = 120 * time.Second
	sendBuffer = 16
)

type Client struct {
	UserID int64
	conn   *websocket.Conn
	send   chan []byte
	hub    *Hub
}

type Hub struct {
	mu      sync.RWMutex
	clients map[int64]map[*Client]struct{}
	rdb     *redis.Client
}

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{clients: make(map[int64]map[*Client]struct{}), rdb: rdb}
}

func onlineKey(uid int64) string { return "sxu:online:" + strconv.FormatInt(uid, 10) }

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	if h.clients[c.UserID] == nil {
		h.clients[c.UserID] = make(map[*Client]struct{})
	}
	h.clients[c.UserID][c] = struct{}{}
	h.mu.Unlock()
	h.Touch(c.UserID)
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	var last bool
	if set, ok := h.clients[c.UserID]; ok {
		if _, present := set[c]; present {
			delete(set, c)
		}
		last = len(set) == 0
		if last {
			delete(h.clients, c.UserID)
		}
	}
	h.mu.Unlock()
	if last {
		if err := h.rdb.Del(context.Background(), onlineKey(c.UserID)).Err(); err != nil {
			slog.Warn("清除在线状态失败", "uid", c.UserID, "err", err)
		}
	}
}

// Touch 刷新在线状态 TTL（收到心跳或任意消息时调用）。
func (h *Hub) Touch(uid int64) {
	h.rdb.Set(context.Background(), onlineKey(uid), 1, onlineTTL)
}

func (h *Hub) IsOnline(uid int64) bool {
	n, err := h.rdb.Exists(context.Background(), onlineKey(uid)).Result()
	return err == nil && n > 0
}

// OnlineCount 在线人数（SCAN online:*，规模小可直接用）。
func (h *Hub) OnlineCount() int64 {
	var cnt int64
	var cursor uint64
	for {
		keys, next, err := h.rdb.Scan(context.Background(), cursor, "sxu:online:*", 500).Result()
		if err != nil {
			break
		}
		cnt += int64(len(keys))
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return cnt
}

func (h *Hub) pushTo(c *Client, data []byte) {
	select {
	case c.send <- data:
	default: // 慢消费者直接丢弃，避免阻塞
	}
}

// Push 向某用户全部连接推送 JSON。
func (h *Hub) Push(uid int64, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients[uid] {
		h.pushTo(c, data)
	}
}

// PushClient 向单连接写原始 JSON 字节（不做二次序列化）。
func (h *Hub) PushClient(c *Client, data []byte) {
	h.pushTo(c, data)
}

func NewClient(uid int64, conn *websocket.Conn, hub *Hub) *Client {
	return &Client{UserID: uid, conn: conn, send: make(chan []byte, sendBuffer), hub: hub}
}

// Serve 注册连接、推送初始消息并启动读写泵（readPump 阻塞在调用 goroutine）。
func (h *Hub) Serve(c *Client, initial ...[]byte) {
	h.Register(c)
	for _, msg := range initial {
		h.PushClient(c, msg)
	}
	go c.writePump()
	c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		var m struct {
			Type string `json:"type"`
		}
		if json.Unmarshal(raw, &m) != nil {
			continue
		}
		switch m.Type {
		case TypePing:
			c.hub.Touch(c.UserID)
			if b, err := json.Marshal(map[string]any{"type": TypePong}); err == nil {
				c.hub.PushClient(c, b)
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
