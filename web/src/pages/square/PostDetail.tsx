import {useEffect, useState} from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  NavBar,
  InfiniteScroll,
  DotLoading,
  Input,
  Button,
  Dialog,
  Tabs,
  Tag,
} from "antd-mobile";
import { HeartOutline, ContentOutline, LoopOutline, StarOutline, StarFill } from "antd-mobile-icons";
import { postApi } from "@/api/job";
import type { CommentViewType } from "@/api/job";
import { Avatar, RoleTag, timeAgo } from "@/components/PostCard";
import { useAuth } from "@/stores/auth";

/** 帖子详情：评论（默认最新）+ 回复（默认点赞，可切最新）+ 点赞/转发 */
export default function PostDetail() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);

  const { data: post } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postApi.detail(postId),
    enabled: !!postId,
  });

  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [newAnswers, setNewAnswers] = useState<CommentViewType[]>([]);

  const doLike = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/square/post/${postId}`)}`);
      return;
    }
    const res = await postApi.toggleLike(1, postId).catch(() => null);
    if (res) {
      setLiked(res.liked);
      setLikeCount(res.count);
    }
  };

  const doRepost = async () => {
    navigate(`/square/publish?repost=${postId}`);
  };

  if (!post) {
    return (
      <div style={{ paddingTop: 120, textAlign: "center", color: "var(--sxu-sub)" }}>
        <DotLoading color="primary" />
      </div>
    );
  }
  const shownLiked = liked ?? post.liked;
  const shownCount = likeCount ?? post.like_count;

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate(-1)}>问答详情</NavBar>

      <div className="sxu-card">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={() => navigate(`/users/${post.user.id}`)}>
          <Avatar u={post.user} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {post.user.nickname}
              <RoleTag role={post.user.role} />
              <Tag color="primary" fill="outline" style={{ fontSize: 11, marginLeft: 6 }}>求助</Tag>
            </div>
            <div className="sxu-sub">{timeAgo(post.created_at)}</div>
          </div>
          {user?.id === post.user.id && (
            <a className="sxu-link" style={{ fontSize: 13 }} onClick={() => {
              Dialog.confirm({
                content: "删除这条问答？",
                onConfirm: async () => {
                  const ok = await postApi.delete(postId).catch(() => null);
                  if (ok !== null) {
                    queryClient.invalidateQueries({ queryKey: ["posts"] });
                    navigate("/square");
                  }
                },
              });
            }}>
              删除
            </a>
          )}
        </div>
        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{post.content}</div>
        {post.repost_of && (
          <div style={{ marginTop: 10, background: "var(--sxu-bg)", borderRadius: 8, padding: "10px 12px", color: "var(--sxu-sub)", fontSize: 13 }}
            onClick={() => post.repost_of && post.repost_of.content !== "原帖已删除" && navigate(`/square/post/${post.repost_of.id}`)}>
            @{post.repost_of.nickname || "原帖"}：{post.repost_of.content}
          </div>
        )}
        {post.repost_comment && (
          <div style={{ marginTop: 10, background: "var(--sxu-bg)", borderRadius: 8, padding: "10px 12px", color: "var(--sxu-sub)", fontSize: 13 }}
            onClick={() => post.repost_comment && navigate(`/square/post/${post.repost_comment.post_id}`)}>
            @{post.repost_comment.nickname || "回答"} 的回答：{post.repost_comment.content}
          </div>
        )}
        <div style={{ display: "flex", gap: 28, marginTop: 16 }}>
          <Action icon={<HeartOutline />} active={shownLiked} label={String(shownCount)} onClick={doLike} />
          <Action icon={<ContentOutline />} label={String(post.comment_count)} onClick={() => {}} />
          <Action icon={<LoopOutline />} label={String(post.repost_count)} onClick={doRepost} />
        </div>
      </div>

      <CommentsBlock postId={postId} prepend={newAnswers} />

      <div className="sxu-footer-bar">
        <CommentBar postId={postId} onDone={(c) => setNewAnswers((p) => [c, ...p])} />
      </div>
    </div>
  );
}

export function Action({
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
      style={{ display: "flex", alignItems: "center", gap: 5, color: active ? "var(--sxu-primary)" : "var(--sxu-sub)", fontSize: 14 }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label !== undefined && <span>{label}</span>}
    </div>
  );
}

function CommentBar({ postId, parentId, replyTo, onDone }: {
  postId: number;
  parentId?: number;
  replyTo?: string;
  onDone?: (c: CommentViewType) => void;
}) {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const submit = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/square/post/${postId}`)}`);
      return;
    }
    if (!text.trim()) return;
    const res = await postApi.createComment(postId, text.trim(), parentId).catch(() => null);
    if (res) {
      setText("");
      onDone?.(res);
    }
  };

  return (
    <>
      <div style={{ flex: 1 }}>
          <Input
            placeholder={replyTo ? `评论 ${replyTo}：` : "写下你的回答，帮助 TA…"}
            value={text}
            onChange={setText}
            onEnterPress={submit}
            style={{ "--font-size": "14px" }}
          />
      </div>
      <Button size="small" color="primary" onClick={submit}>
        发送
      </Button>
    </>
  );
}

function CommentsBlock({ postId, prepend = [] }: { postId: number; prepend?: CommentViewType[] }) {
  const [sort, setSort] = useState<"latest" | "likes">("latest");
  const [extra, setExtra] = useState<CommentViewType[]>([]);
  const [newOnes, setNewOnes] = useState<CommentViewType[]>([]);
  const [countBumps, setCountBumps] = useState<Record<number, number>>({});
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["comments", postId, sort],
    queryFn: () => postApi.comments(postId, sort, 1),
    // 切换排序时保留旧列表，避免加载瞬间内容塌陷晃动
    placeholderData: (prev) => prev,
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  // 新发表的评论置顶（本地插入不刷新），与接口数据按 id 去重
  const seen = new Set<number>();
  const list = [...newOnes, ...(query.data?.list ?? []), ...extra].filter((c) =>
    seen.has(c.id) ? false : (seen.add(c.id), true),
  );

  const loadMore = async () => {
    const res = await postApi.comments(postId, sort, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  // 回答输入框在页面底部，这里接收它新发表的回答
  useEffect(() => {
    setNewOnes((p) => (prepend.length > p.length ? prepend : p));
  }, [prepend]);

  const onChanged = () => {
    setExtra([]);
    setPage(1);
    setHasMore(false);
    setNewOnes([]);
    query.refetch();
  };

  const onReplyAdded = (parentId: number) =>
    setCountBumps((b) => ({ ...b, [parentId]: (b[parentId] ?? 0) + 1 }));

  return (
    <div className="sxu-card">
      <div className="sxu-tabs-right" style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>回答</div>
        <Tabs
          activeKey={sort}
          activeLineMode="auto"
          style={{ "--title-font-size": "13px", "--content-padding": "0" }}
          onChange={(k) => setSort(k as "latest" | "likes")}
        >
          <Tabs.Tab title="最新" key="latest" />
          <Tabs.Tab title="最热" key="likes" />
        </Tabs>
      </div>
      {query.isLoading ? (
        <Center><DotLoading color="primary" /></Center>
      ) : list.length === 0 ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 24 }}>还没有评论，抢沙发～</div>
      ) : (
        <>
          {list.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replyCount={c.reply_count + (countBumps[c.id] ?? 0)}
              onChanged={onChanged}
              onReplyAdded={onReplyAdded}
            />
          ))}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </>
      )}
    </div>
  );
}

function CommentItem({ comment, replyCount, onChanged, onReplyAdded }: {
  comment: CommentViewType;
  replyCount: number;
  onChanged: () => void;
  onReplyAdded: (parentId: number) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [faved, setFaved] = useState(comment.favorited);
  const [favCount, setFavCount] = useState(comment.fav_count);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/square/post/${comment.post_id}`)}`);
    const res = await postApi.toggleLike(2, comment.id).catch(() => null);
    if (res) {
      setLiked(res.liked);
      setLikeCount(res.count);
    }
  };

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/square/post/${comment.post_id}`)}`);
    const res = await postApi.toggleFavorite(2, comment.id).catch(() => null);
    if (res) {
      setFaved(res.favorited);
      setFavCount(res.count);
    }
  };

  const repostAnswer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/square/post/${comment.post_id}`)}`);
    navigate(`/square/publish?repost_comment=${comment.id}`);
  };

  const del = async (e: React.MouseEvent) => {
    e.stopPropagation();
    Dialog.confirm({
      content: "删除这条回答？",
      onConfirm: async () => {
        const ok = await postApi.deleteComment(comment.id).catch(() => null);
        if (ok !== null) onChanged();
      },
    });
  };

  return (
    <div className="sxu-lazy" style={{ padding: "12px 0", borderBottom: "1px solid var(--sxu-line)" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div onClick={() => navigate(`/users/${comment.user.id}`)} style={{ cursor: "pointer" }}>
          <Avatar u={comment.user} size={32} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sxu-row">
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {comment.user.nickname}
              <RoleTag role={comment.user.role} />
            </div>
            {user?.id === comment.user.id && (
              <a style={{ fontSize: 12, color: "var(--sxu-sub)" }} onClick={del}>删除</a>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {comment.content}
          </div>
          <div className="sxu-row" style={{ marginTop: 6 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span className="sxu-sub" style={{ display: "inline-flex", alignItems: "center", gap: 3 }} onClick={toggleLike}>
                <HeartOutline fontSize={14} color={liked ? "var(--sxu-primary)" : undefined} /> {likeCount}
              </span>
              <span className="sxu-sub" onClick={() => setShowReplies((v) => !v)}>
                <ContentOutline fontSize={14} /> {replyCount > 0 ? `${replyCount} 条评论` : "评论"}
              </span>
              <span
                className="sxu-sub"
                style={{ display: "inline-flex", alignItems: "center", gap: 3, color: faved ? "var(--sxu-primary)" : undefined }}
                onClick={toggleFav}
              >
                {faved ? <StarFill fontSize={14} color="var(--sxu-primary)" /> : <StarOutline fontSize={14} />} {favCount}
              </span>
              <span className="sxu-sub" style={{ display: "inline-flex", alignItems: "center", gap: 3 }} onClick={repostAnswer}>
                <LoopOutline fontSize={14} /> {comment.repost_count}
              </span>
            </div>
            <span className="sxu-sub">{timeAgo(comment.created_at)}</span>
          </div>

          {showReplies && (
            <RepliesBlock comment={comment} replyCount={replyCount} onReplyAdded={onReplyAdded} />
          )}
        </div>
      </div>
    </div>
  );
}

function RepliesBlock({ comment, replyCount, onReplyAdded }: {
  comment: CommentViewType;
  replyCount: number;
  onReplyAdded: (parentId: number) => void;
}) {
  const [sort, setSort] = useState<"likes" | "latest">("likes");
  const [extra, setExtra] = useState<CommentViewType[]>([]);
  const [newOnes, setNewOnes] = useState<CommentViewType[]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["replies", comment.id, sort],
    queryFn: () => postApi.replies(comment.id, sort, 1),
    // 切换排序时保留旧列表，避免加载瞬间内容塌陷晃动
    placeholderData: (prev) => prev,
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  // 新发表的回复置顶（本地插入不刷新），与接口数据按 id 去重
  const seen = new Set<number>();
  const list = [...newOnes, ...(query.data?.list ?? []), ...extra].filter((r) =>
    seen.has(r.id) ? false : (seen.add(r.id), true),
  );
  const loadMore = async () => {
    const res = await postApi.replies(comment.id, sort, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);

  };

  return (
    <div style={{ marginTop: 10, background: "var(--sxu-bg)", borderRadius: 8, padding: "4px 10px 10px" }}>
      <div className="sxu-row" style={{ padding: "8px 0 2px" }}>
        <span className="sxu-sub">评论（{replyCount}）</span>
        <span style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--sxu-sub)" }}>
          <a onClick={() => setSort("likes")} style={{ color: sort === "likes" ? "var(--sxu-primary)" : undefined }}>最热</a>
          <a onClick={() => setSort("latest")} style={{ color: sort === "latest" ? "var(--sxu-primary)" : undefined }}>最新</a>
        </span>
      </div>
      {list.map((r) => (
        <ReplyItem key={r.id} reply={r} />
      ))}
      {list.length === 0 && <div className="sxu-sub" style={{ padding: "8px 0" }}>暂无评论</div>}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <CommentBar
          postId={comment.post_id}
          parentId={comment.id}
          replyTo={comment.user.nickname}
          onDone={(c) => {
            setNewOnes((p) => [c, ...p]);
            onReplyAdded(comment.id);
          }}
        />
      </div>
    </div>
  );
}

function ReplyItem({ reply }: { reply: CommentViewType }) {
  const [liked, setLiked] = useState(reply.liked);
  const [likeCount, setLikeCount] = useState(reply.like_count);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate("/login");
    const res = await postApi.toggleLike(2, reply.id).catch(() => null);
    if (res) {
      setLiked(res.liked);
      setLikeCount(res.count);
    }
  };

  return (
    <div className="sxu-lazy" style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--sxu-line)" }}>
      <Avatar u={reply.user} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12 }}>
          <b>{reply.user.nickname}</b>
          <RoleTag role={reply.user.role} />
          {reply.reply_to_user && reply.reply_to_user.id !== reply.user.id && (
            <span className="sxu-sub"> → {reply.reply_to_user.nickname}</span>
          )}
          <span className="sxu-sub" style={{ marginLeft: 8 }}>{timeAgo(reply.created_at)}</span>
        </div>
        <div style={{ fontSize: 13, marginTop: 3, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{reply.content}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 3 }}>
          <span className="sxu-sub" style={{ display: "inline-flex", alignItems: "center", gap: 3 }} onClick={toggleLike}>
            <HeartOutline fontSize={12} color={liked ? "var(--sxu-primary)" : undefined} /> {likeCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 24 }}>{children}</div>;
}
