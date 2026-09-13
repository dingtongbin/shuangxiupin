import { create } from "zustand";
import type { SelfView, UnreadPayload } from "@/api/types";
import { authApi } from "@/api/auth";
import { setUnauthorizedHandler } from "@/api/client";

interface AuthState {
  user: SelfView | null;
  loaded: boolean;
  unread: UnreadPayload;
  fetchMe: () => Promise<SelfView | null>;
  setUser: (u: SelfView | null) => void;
  logout: () => Promise<void>;
  setUnread: (u: UnreadPayload) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loaded: false,
  unread: { system: 0, interact: 0, total: 0 },
  fetchMe: async () => {
    try {
      const u = await authApi.me();
      set({ user: u, loaded: true });
      return u;
    } catch {
      set({ user: null, loaded: true });
      return null;
    }
  },
  setUser: (u) => set({ user: u, loaded: true }),
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, unread: { system: 0, interact: 0, total: 0 } });
    }
  },
  setUnread: (u) => set({ unread: u }),
}));

// 401 时清空登录态（路由守卫负责跳登录页）
setUnauthorizedHandler(() => {
  useAuth.getState().setUser(null);
});
