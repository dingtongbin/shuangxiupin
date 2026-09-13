import { http } from "./client";
import type { PageResult, PostView, JobView } from "./types";
import type { CommentViewType } from "./job";
import type { UserBrief } from "./types";

export interface AdminUserView {
  id: number;
  email: string;
  nickname: string;
  role: number;
  role_label: string;
  status: number;
  created_at: string;
}

export interface AdminCertView {
  id: number;
  user?: UserBrief | null;
  email: string;
  company_name: string;
  contact_email: string;
  note: string;
  status: number;
  reject_reason: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminReviewView {
  id: number;
  company_id: number;
  company_name: string;
  user: UserBrief;
  overall: number;
  dims: Record<string, number>;
  content: string;
  like_count: number;
  status: number;
  created_at: string;
}

export interface AdminJobView extends JobView {}

export interface AdminCompanyView {
  id: number;
  name: string;
  logo: string;
  industry: string;
  size: string;
  funding: string;
  rest_type: number;
  rest_label: string;
  avg_rating: number;
  rating_count: number;
  review_count: number;
}

export interface EmailDomainView {
  id: number;
  domain: string;
  enabled: boolean;
  remark: string;
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

export const adminApi = {
  // 角色与权限（系统管理控制台）
  roles: () => http.get<{ data: RoleView[] }>("/sys/roles").then((r) => r.data.data),
  permissions: () => http.get<{ data: PermissionView[] }>("/sys/permissions").then((r) => r.data.data),
  createRole: (payload: { code: string; name: string; remark?: string; permissions: number[] }) =>
    http.post("/sys/roles", payload),
  updateRole: (id: number, payload: { name?: string; remark?: string; permissions: number[] }) =>
    http.put(`/sys/roles/${id}`, payload),
  deleteRole: (id: number) => http.delete(`/sys/roles/${id}`),
  setUserRoles: (uid: number, roleIds: number[]) =>
    http.post<{ data: { perms: string[] } }>(`/sys/users/${uid}/roles`, { role_ids: roleIds }),

  // 用户管理（系统管理员）
  users: (params: { kw?: string; role?: number; status?: number; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<AdminUserView> }>("/sys/users", { params }).then((r) => r.data.data),
  createUser: (payload: { email: string; password: string; nickname?: string; role: number }) =>
    http.post("/sys/users", payload),
  updateUser: (
    id: number,
    payload: { status?: number; role?: number; nickname?: string; password?: string },
  ) => http.put(`/sys/users/${id}`, payload),
  deleteUser: (id: number) => http.delete(`/sys/users/${id}`),
  domains: () => http.get<{ data: EmailDomainView[] }>("/sys/email-domains").then((r) => r.data.data),
  addDomain: (domain: string, remark?: string) =>
    http.post("/sys/email-domains", { domain, remark }),
  toggleDomain: (id: number) => http.post(`/sys/email-domains/${id}/toggle`),

  // 企业认证（运营/系统）
  certs: (status: number, page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<AdminCertView> }>("/admin/certs", {
        params: { status, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  reviewCert: (id: number, approve: boolean, reason?: string) =>
    http.post(`/admin/certs/${id}/review`, { approve, reason }),
  certify: (userId: number, companyName?: string) =>
    http.post<{ data: { user_id: number; company_id: number } }>("/admin/certify", {
      user_id: userId,
      company_name: companyName,
    }),

  // 内容运营（运营）
  posts: (params: { kw?: string; status?: number; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<PostView> }>("/admin/posts", { params }).then((r) => r.data.data),
  hidePost: (id: number) => http.post(`/admin/posts/${id}/hide`),
  restorePost: (id: number) => http.post(`/admin/posts/${id}/restore`),
  deletePost: (id: number) => http.delete(`/admin/posts/${id}`),

  comments: (params: { kw?: string; status?: number; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<CommentViewType> }>("/admin/comments", { params }).then((r) => r.data.data),
  hideComment: (id: number) => http.post(`/admin/comments/${id}/hide`),
  restoreComment: (id: number) => http.post(`/admin/comments/${id}/restore`),
  deleteComment: (id: number) => http.delete(`/admin/comments/${id}`),

  reviews: (params: { kw?: string; status?: number; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<AdminReviewView> }>("/admin/reviews", { params }).then((r) => r.data.data),
  hideReview: (id: number) => http.post(`/admin/reviews/${id}/hide`),
  restoreReview: (id: number) => http.post(`/admin/reviews/${id}/restore`),
  deleteReview: (id: number) => http.delete(`/admin/reviews/${id}`),

  jobs: (params: { kw?: string; status?: number; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<AdminJobView> }>("/admin/jobs", { params }).then((r) => r.data.data),
  deleteJob: (id: number) => http.delete(`/admin/jobs/${id}`),

  companies: (params: { kw?: string; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<AdminCompanyView> }>("/admin/companies", { params }).then((r) => r.data.data),
  updateCompany: (
    id: number,
    payload: { logo?: string; industry?: string; size?: string; funding?: string; rest_type?: number },
  ) => http.put(`/admin/companies/${id}`, payload),

  sendSystemMsg: (content: string, userId?: number) =>
    http.post("/sys/notify", { content, user_id: userId ?? 0 }),
};
