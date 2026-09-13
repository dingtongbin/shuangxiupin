package handler

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/shuangxiupin/server/internal/ws"
)

func newUpgrader(origins []string) *websocket.Upgrader {
	return &websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			for _, o := range origins {
				if o == origin {
					return true
				}
			}
			u, err := url.Parse(origin)
			return err == nil && u.Host == r.Host
		},
	}
}

func newWSClient(uid int64, conn *websocket.Conn, hub *ws.Hub) *ws.Client {
	return ws.NewClient(uid, conn, hub)
}

func wsUnauthorizedBody() gin.H {
	return gin.H{"code": 40100, "msg": "请先登录"}
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}
