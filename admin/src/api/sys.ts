import { http, call } from "./client";

export interface SelfView {
  id: number;
  email: string;
  nickname: string;
  role: number;
  role_label: string;
  perms: string[];
  must_change_pwd: boolean;
}

export interface AdminUserView {
  id: number;
  email: string;
  nickname: string;
  role: number;
  role_label: string;
  status: number;
  created_at: string;
}

export interface RoleView {
  id: number;
  code: string;
  name: string;
  builtin: boolean;
  remark: string;
  permissions: string[];
  user_count: number;
  created_at: string;
}

export interface PermissionView {
  id: number;
  code: string;
  name: string;
  group: string;
}

export interface SettingItem {
  key: string;
  name: string;
  remark: string;
  type: "bool" | "int" | "string" | "secret";
  default: string;
  value: string;
  placeholder?: string;
}

export interface AnnouncementView {
  id: number;
  content: string;
  created_by: number;
  created_at: string;
}

export interface EmailDomainView {
  id: number;
  domain: string;
  enabled: boolean;
  remark: string;
  created_at: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  has_more: boolean;
}

export const authApi = {
  me: () => http.get<{ data: SelfView }>("/auth/me").then((r) => r.data.data),
  login: (email: string, password: string) =>
    http.post<{ data: SelfView }>("/auth/login", { email, password }).then((r) => r.data.data),
  logout: () => http.post("/auth/logout"),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post("/auth/password", { old_password: oldPassword, new_password: newPassword }),
};

export const sysApi = {
  users: (params: { kw?: string; role?: number; status?: number; page: number; page_size: number }) =>
    http.get<{ data: PageResult<AdminUserView> }>("/sys/users", { params }).then((r) => r.data.data),
  createUser: (payload: { email: string; password: string; nickname?: string; role: number }) =>
    call(() => http.post("/sys/users", payload)),
  updateUser: (
    id: number,
    payload: { status?: number; role?: number; nickname?: string; password?: string },
  ) => call(() => http.put(`/sys/users/${id}`, payload)),
  deleteUser: (id: number) => call(() => http.delete(`/sys/users/${id}`)),
  userRoles: (id: number) =>
    http.get<{ data: number[] }>(`/sys/users/${id}/roles`).then((r) => r.data.data),
  setUserRoles: (id: number, roleIds: number[]) =>
    call(() => http.post(`/sys/users/${id}/roles`, { role_ids: roleIds })),

  roles: () => http.get<{ data: RoleView[] }>("/sys/roles").then((r) => r.data.data),
  permissions: () => http.get<{ data: PermissionView[] }>("/sys/permissions").then((r) => r.data.data),
  createRole: (payload: { code: string; name: string; remark?: string; permissions: number[] }) =>
    call(() => http.post("/sys/roles", payload)),
  updateRole: (id: number, payload: { name?: string; remark?: string; permissions: number[] }) =>
    call(() => http.put(`/sys/roles/${id}`, payload)),
  deleteRole: (id: number) => call(() => http.delete(`/sys/roles/${id}`)),

  configs: () =>
    http
      .get<{ data: SettingItem[] }>("/sys/configs")
      .then((r) => r.data.data),
  updateConfigs: (values: Record<string, string>) =>
    call(() => http.put("/sys/configs", { values })),
  mailTest: (to: string) =>
    call(() => http.post("/sys/configs/mail-test", { to })),
  domains: () => http.get<{ data: EmailDomainView[] }>("/sys/email-domains").then((r) => r.data.data),
  addDomain: (domain: string, remark?: string) =>
    call(() => http.post("/sys/email-domains", { domain, remark })),
  toggleDomain: (id: number) => call(() => http.post(`/sys/email-domains/${id}/toggle`)),

  announcements: (page: number, pageSize = 20) =>
    http.get<{ data: PageResult<AnnouncementView> }>("/sys/announcements", {
      params: { page, page_size: pageSize },
    }).then((r) => r.data.data),
  createAnnouncement: (content: string) =>
    call(() => http.post("/sys/announcements", { content })),
};
