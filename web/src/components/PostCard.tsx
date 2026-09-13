import { useNavigate } from "react-router";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  HeartOutline,
  ContentOutline,
  LoopOutline,
  UserOutline,
} from "antd-mobile-icons";
import { postApi } from "@/api/job";
import type { PostView } from "@/api/types";
import { useAuth } from "@/stores/auth";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export function timeAgo(t: string): string {
  return dayjs(t).fromNow();
}

/** 帖子卡片：广场帖子流 / 关注流 / 作品列表 / 搜索结果共用 */
export function PostCard({ post, onChanged }: { post: PostView; onChanged?: () => void }) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent("/square")}`);
      return;
    }
    const res = await postApi.toggleLike(1, post.id).catch(() => null);
    if (res) {
      setLiked(res.liked);
      setLikeCount(res.count);
      onChanged?.();
    }
  };

  return (
    <div className="sxu-card sxu-feed-card sxu-lazy" onClick={() => navigate(`/square/post/${post.id}`)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar u={post.user} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {post.user.nickname}
            <RoleTag role={post.user.role} />
          </div>
          <div className="sxu-sub">{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.55 }}>
        {post.content}
      </div>
      {post.repost_of && (
        <div
          style={{
            marginTop: 8,
            background: "var(--sxu-bg)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--sxu-sub)",
            fontSize: 13,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          @{post.repost_of.nickname || "原帖"}：{post.repost_of.content}
        </div>
      )}
      {post.repost_comment && (
        <div
          style={{
            marginTop: 8,
            background: "var(--sxu-bg)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--sxu-sub)",
            fontSize: 13,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/square/post/${post.repost_comment!.post_id}`);
          }}
        >
          💬 {post.repost_comment.nickname || "回答"} 的回答：{post.repost_comment.content}
        </div>
      )}
      <div className="sxu-row" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 28 }} onClick={(e) => e.stopPropagation()}>
          <Action icon={<HeartOutline />} active={liked} label={String(likeCount)} onClick={toggleLike} />
          <Action
            icon={<ContentOutline />}
            label={String(post.comment_count)}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/square/post/${post.id}`);
            }}
          />
          <Action
            icon={<LoopOutline />}
            label={String(post.repost_count)}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/square/publish?repost=${post.id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 4, color: active ? "var(--sxu-primary)" : "var(--sxu-sub)", fontSize: 13 }}
    >
      <span style={{ fontSize: 17 }}>{icon}</span>
      {label !== undefined && <span>{label}</span>}
    </div>
  );
}

/** 昵称旁身份小标签：招聘者（认证企业用户）/ 运营（运营管理员） */
export function RoleTag({ role }: { role?: number }) {
  if (role === 2) {
    return (
      <span
        style={{
          marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, lineHeight: "15px",
          fontWeight: 600, flexShrink: 0, verticalAlign: "middle", display: "inline-block",
          background: "var(--sxu-primary-weak)", color: "var(--sxu-primary)",
        }}
      >
        招聘者
      </span>
    );
  }
  if (role === 3) {
    return (
      <span
        style={{
          marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, lineHeight: "15px",
          fontWeight: 600, flexShrink: 0, verticalAlign: "middle", display: "inline-block",
          background: "var(--sxu-red-weak)", color: "#e0533f",
        }}
      >
        运营
      </span>
    );
  }
  return null;
}

export function Avatar({ u, size = 40 }: { u: { avatar: string; nickname: string }; size?: number }) {
  if (u.avatar) {
    return (
      <img
        src={u.avatar}
        alt={u.nickname}
        loading="lazy"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--sxu-line)",
        color: "var(--sxu-sub)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <UserOutline style={{ fontSize: Math.round(size * 0.62) }} />
    </div>
  );
}
