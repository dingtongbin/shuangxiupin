import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";

/**
 * 登录后建立 WebSocket 长连接：
 * - 每 30s 发 {"type":"ping"} 维持在线状态（服务端写 Redis 在线键）
 * - 收到 notification/unread 时刷新未读数
 * - 断线自动重连（指数退避，最长 30s）
 */
export function useWebSocket() {
  const user = useAuth((s) => s.user);
  const setUnread = useAuth((s) => s.setUnread);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }
    let closed = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (closed) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      // 静态托管（如 GitHub Pages）时经 VITE_API_BASE 指向自建后端
      const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
      const host = apiBase ? new URL(apiBase).host : location.host;
      const ws = new WebSocket(`${proto}://${host}/api/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 30000);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === "unread") {
            setUnread(msg.data);
          } else if (msg.type === "notification") {
            queryClient.invalidateQueries({ queryKey: ["unread"] });
          } else if (msg.type === "logout") {
            useAuth.getState().setUser(null);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (closed) return;
        const delay = Math.min(30000, 1000 * 2 ** retryRef.current++);
        timerRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, setUnread, queryClient]);
}
