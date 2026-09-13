import { http } from "./client";
import type { NotificationView, PageResult, UserBrief, JobView, CompanyView, PostView } from "./types";

export interface AnnouncementView {
  id: number;
  content: string;
  created_at: string;
}

export const messageApi = {
  announcements: (page: number, pageSize = 20) =>
    http
      .get<{ data: PageResult<AnnouncementView> }>("/announcements", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  list: (type: "system" | "interact", page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<NotificationView> }>("/messages", {
        params: { type, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  markRead: (ids?: number[], all?: boolean) =>
    http.post("/messages/read", { ids, all }),
  unread: () =>
    http
      .get<{ data: { system: number; interact: number; total: number } }>("/messages/unread")
      .then((r) => r.data.data),
};

export const searchApi = {
  jobs: (params: Record<string, unknown>) =>
    http.get<{ data: PageResult<JobView> }>("/search/jobs", { params }).then((r) => r.data.data),
  posts: (kw: string, page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<PostView> }>("/search/posts", { params: { kw, page, page_size: pageSize } })
      .then((r) => r.data.data),
  companies: (kw: string, sort: string, page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CompanyView> }>("/search/companies", {
        params: { kw, sort, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  users: (kw: string, page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<UserSearchItem> }>("/search/users", {
        params: { kw, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
};

export interface UserSearchItem extends UserBrief {
  bio: string;
  role: number;
  role_label: string;
  following: boolean;
}
