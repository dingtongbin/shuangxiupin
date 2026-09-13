import { http } from "./client";
import type { PageResult, PostView, UserProfileView, Dicts, SelfView, CommentView, HistoryItem, JobView } from "./types";

export const userApi = {
  updateMe: (payload: {
    nickname?: string;
    bio?: string;
    contact_email?: string;
    avatar?: string;
  }) => http.put<{ data: SelfView }>("/me", payload).then((r) => r.data.data),
  profile: (id: number) =>
    http.get<{ data: UserProfileView }>(`/users/${id}`).then((r) => r.data.data),
  posts: (id: number, page: number, pageSize = 10, kind?: "" | "post" | "repost") =>
    http
      .get<{ data: PageResult<PostView> }>(`/users/${id}/posts`, {
        params: { page, page_size: pageSize, kind: kind || undefined },
      })
      .then((r) => r.data.data),
  answers: (id: number, page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CommentView> }>(`/users/${id}/answers`, {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  history: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<HistoryItem> }>("/me/history", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  historyJobs: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<JobView> }>("/me/history/jobs", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  clearHistory: () => http.delete("/me/history"),
  isFollowing: (id: number) =>
    http.get<{ data: { following: boolean } }>(`/follows/${id}`).then((r) => r.data.data),
  toggleFollow: (id: number) =>
    http
      .post<{ data: { following: boolean } }>(`/follows/${id}/toggle`)
      .then((r) => r.data.data),
  dicts: () => http.get<{ data: Dicts }>("/dicts").then((r) => r.data.data),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<{ data: { url: string } }>("/upload", form).then((r) => r.data.data);
  },
};

export interface CertRequestView {
  id: number;
  user?: { id: number; nickname: string; avatar: string; role: number } | null;
  email: string;
  company_name: string;
  contact_email: string;
  note: string;
  status: number; // 1待审 2通过 3驳回
  reject_reason: string;
  created_at: string;
  reviewed_at: string | null;
}

export const certApi = {
  submit: (payload: { company_name: string; contact_email?: string; note?: string }) =>
    http.post("/cert-requests", payload),
  my: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CertRequestView> }>("/cert-requests/my", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
};
