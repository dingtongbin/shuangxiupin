// 与后端 internal/service 视图结构对应的类型定义（全量 TS）

export interface SelfView {
  id: number;
  email: string;
  nickname: string;
  avatar: string;
  bio: string;
  contact_email: string;
  role: number; // 1普通 2企业 3运营 4系统
  role_label: string;
  perms: string[]; // RBAC 权限点
  created_at: string;
  must_change_pwd: boolean;
}

export interface UserBrief {
  id: number;
  nickname: string;
  avatar: string;
  role: number; // 2=招聘者 3=运营，昵称旁小标签
}

export interface UserProfileView {
  id: number;
  nickname: string;
  avatar: string;
  bio: string;
  contact_email: string;
  role: number;
  role_label: string;
  created_at: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  following: boolean;
}

export interface RepostRef {
  id: number;
  nickname: string;
  content: string;
}

export interface RepostAnswerRef {
  id: number;
  post_id: number;
  nickname: string;
  content: string;
}

export interface PostView {
  id: number;
  user: UserBrief;
  content: string;
  repost_of_id: number;
  repost_of?: RepostRef;
  repost_comment_id: number;
  repost_comment?: RepostAnswerRef;
  like_count: number;
  comment_count: number;
  repost_count: number;
  liked: boolean;
  status: number;
  created_at: string;
}

export interface CommentView {
  id: number;
  post_id: number;
  parent_id: number;
  user: UserBrief;
  reply_to_user_id: number;
  reply_to_user?: UserBrief;
  content: string;
  like_count: number;
  fav_count: number;
  favorited: boolean;
  repost_count: number;
  reply_count: number;
  liked: boolean;
  created_at: string;
}

export interface ReviewView {
  id: number;
  company_id: number;
  user: UserBrief;
  overall: number;
  dims: Record<string, number>;
  content: string;
  like_count: number;
  liked: boolean;
  created_at: string;
}

export interface CompanyView {
  id: number;
  name: string;
  logo: string;
  industry: string;
  size: string;
  funding: string;
  rest_type: number; // 1双休 2单休 3不定
  rest_label: string;
  credit_code: string; // 统一社会信用代码
  legal_person: string;
  reg_capital: string;
  paid_capital: string;
  insured_cnt: number;
  founded_on: string;
  main_biz: string;
  avg_rating: number;
  rating_count: number;
  review_count: number;
  created_at: string;
  top_review?: ReviewView;
}

export interface JobView {
  id: number;
  title: string;
  salary_text: string;
  salary_min: number;
  salary_max: number;
  education: number;
  education_label: string;
  experience: number;
  experience_label: string;
  city: string;
  district: string;
  street: string;
  region_text: string;
  contact_phone: string;
  contact_email: string;
  work_cycle: string;
  work_days_week: number;
  work_hours: string;
  recruit_start: string;
  recruit_end: string;
  description: string;
  status: number; // 1在招 2下架
  created_at: string;
  company: { id: number; name: string; logo: string };
  company_size: string;
  company_funding: string;
  company_industry: string;
  publisher: UserBrief;
  favorited: boolean; // 当前登录用户是否已收藏（详情页）
}

export interface NotificationView {
  id: number;
  type: number; // 1系统 2赞 3评论 4关注 5转发
  sender?: UserBrief;
  post_id: number;
  company_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface AnnouncementView {
  id: number;
  content: string;
  created_at: string;
}

export interface HistoryItem {
  target_type: number; // 1 问答 4 职位
  target_id: number;
  title: string;
  sub: string;
  updated_at: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  has_more: boolean;
}

export interface Dicts {
  educations: { value: number; label: string }[];
  experiences: { value: number; label: string }[];
  industries: string[];
  sizes: string[];
  fundings: string[];
  salary_buckets: { label: string; min: number; max: number }[];
  rest_types: { value: number; label: string }[];
  review_dims: { key: string; label: string }[];
  company_sorts: string[];
  email_domains: string[];
}

export interface UnreadPayload {
  system: number;
  interact: number;
  total: number;
}

export const ROLE = {
  USER: 1,
  ENTERPRISE: 2,
  OPS: 3,
  SYS: 4,
} as const;
