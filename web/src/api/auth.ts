import { http } from "./client";
import type { SelfView } from "./types";

export const authApi = {
  sendCode: (email: string, purpose: "register" | "reset") =>
    http.post("/auth/code", { email, purpose }),
  register: (payload: { email: string; code: string; password: string; nickname?: string }) =>
    http.post<{ data: SelfView }>("/auth/register", payload).then((r) => r.data.data),
  login: (email: string, password: string) =>
    http.post<{ data: SelfView }>("/auth/login", { email, password }).then((r) => r.data.data),
  logout: () => http.post("/auth/logout"),
  me: () => http.get<{ data: SelfView }>("/auth/me").then((r) => r.data.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post("/auth/password", { old_password: oldPassword, new_password: newPassword }),
  reset: (email: string, code: string, newPassword: string) =>
    http.post<{ data: SelfView }>("/auth/reset", { email, code, new_password: newPassword }).then((r) => r.data.data),
};
