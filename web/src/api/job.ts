import { http } from "./client";
import type { CompanyView, JobView, PageResult, PostView, ReviewView } from "./types";

export interface JobQueryParams {
  kw?: string;
  city?: string;
  education?: number;
  experience?: number;
  industry?: string;
  size?: string;
  funding?: string;
  salary?: string;
  company_id?: number;
  page?: number;
  page_size?: number;
}

export const jobApi = {
  list: (params: JobQueryParams) =>
    http.get<{ data: PageResult<JobView> }>("/jobs", { params }).then((r) => r.data.data),
  detail: (id: number) =>
    http.get<{ data: JobView }>(`/jobs/${id}`).then((r) => r.data.data),
  create: (payload: Record<string, unknown>) =>
    http.post<{ data: JobView }>("/enterprise/jobs", payload).then((r) => r.data.data),
  my: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<JobView> }>("/enterprise/jobs", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  update: (id: number, payload: Record<string, unknown>) =>
    http.put<{ data: JobView }>(`/enterprise/jobs/${id}`, payload).then((r) => r.data.data),
  close: (id: number) => http.post(`/enterprise/jobs/${id}/close`),
  open: (id: number) => http.post(`/enterprise/jobs/${id}/open`),
  favorite: (id: number) =>
    http
      .post<{ data: { favorited: boolean; count: number } }>("/favorites", {
        target_type: 4,
        target_id: id,
      })
      .then((r) => r.data.data),
  myFavorites: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<JobView> }>("/me/favorites", {
        params: { type: 4, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
};

export const companyApi = {
  list: (params: { kw?: string; sort?: string; page?: number; page_size?: number }) =>
    http.get<{ data: PageResult<CompanyView> }>("/companies", { params }).then((r) => r.data.data),
  detail: (id: number) =>
    http.get<{ data: CompanyView }>(`/companies/${id}`).then((r) => r.data.data),
  create: (payload: {
    name: string;
    logo?: string;
    industry?: string;
    size?: string;
    funding?: string;
    rest_type?: number;
  }) =>
    http
      .post<{ data: { company: CompanyView; created: boolean } }>("/companies", payload)
      .then((r) => r.data.data),
  reviews: (id: number, sort: "latest" | "likes", page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<ReviewView> }>(`/companies/${id}/reviews`, {
        params: { sort, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  createReview: (
    id: number,
    payload: { overall: number; content: string; dims?: Record<string, number> },
  ) => http.post<{ data: ReviewView }>(`/companies/${id}/reviews`, payload).then((r) => r.data.data),
};

export const postApi = {
  feed: (tab: "latest" | "follow", page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<PostView> }>("/posts", { params: { tab, page, page_size: pageSize } })
      .then((r) => r.data.data),
  detail: (id: number) =>
    http.get<{ data: PostView }>(`/posts/${id}`).then((r) => r.data.data),
  create: (content: string, repostOfId?: number, repostCommentId?: number) =>
    http
      .post<{ data: PostView }>("/posts", {
        content,
        repost_of_id: repostOfId ?? 0,
        repost_comment_id: repostCommentId ?? 0,
      })
      .then((r) => r.data.data),
  toggleFavorite: (targetType: 1 | 2 | 3 | 4, targetId: number) =>
    http
      .post<{ data: { favorited: boolean; count: number } }>("/favorites", {
        target_type: targetType,
        target_id: targetId,
      })
      .then((r) => r.data.data),
  myFavorites: (page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CommentViewType> }>("/me/favorites", {
        params: { type: 2, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  delete: (id: number) => http.delete(`/posts/${id}`),
  comments: (postId: number, sort: "latest" | "likes", page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CommentViewType> }>(`/posts/${postId}/comments`, {
        params: { sort, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  createComment: (postId: number, content: string, parentId?: number) =>
    http
      .post<{ data: CommentViewType }>(`/posts/${postId}/comments`, {
        content,
        parent_id: parentId ?? 0,
      })
      .then((r) => r.data.data),
  replies: (commentId: number, sort: "latest" | "likes", page: number, pageSize = 10) =>
    http
      .get<{ data: PageResult<CommentViewType> }>(`/comments/${commentId}/replies`, {
        params: { sort, page, page_size: pageSize },
      })
      .then((r) => r.data.data),
  deleteComment: (commentId: number) => http.delete(`/comments/${commentId}`),
  toggleLike: (targetType: 1 | 2 | 3, targetId: number) =>
    http
      .post<{ data: { liked: boolean; count: number } }>("/likes", {
        target_type: targetType,
        target_id: targetId,
      })
      .then((r) => r.data.data),
};

export type CommentViewType = {
  id: number;
  post_id: number;
  parent_id: number;
  user: { id: number; nickname: string; avatar: string; role: number };
  reply_to_user_id: number;
  reply_to_user?: { id: number; nickname: string; avatar: string; role: number };
  content: string;
  like_count: number;
  fav_count: number;
  favorited: boolean;
  repost_count: number;
  reply_count: number;
  liked: boolean;
  status: number;
  created_at: string;
};
