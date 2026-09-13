import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs, DotLoading, Button, InfiniteScroll, Empty } from "antd-mobile";
import {
  SetOutline,
  ClockCircleOutline,
  EyeOutline,
  StarOutline,
  FileOutline,
  AppOutline,
  CompassOutline,
} from "antd-mobile-icons";
import { useAuth } from "@/stores/auth";
import { Avatar, PostCard, RoleTag, timeAgo } from "@/components/PostCard";
import { userApi } from "@/api/user";
import type { CommentView, PostView } from "@/api/types";
import { ROLE } from "@/api/types";

/** 「我」：顶部个人资料 + 方块入口（浏览记录/收藏/收藏的职位）+ 回答/转发 tab；右上角设置 */
export default function Me() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState("answers");
  if (!user) return null;

  const entries = [
    { icon: <ClockCircleOutline />, label: "浏览记录", to: "/me/history" },
    { icon: <EyeOutline />, label: "浏览的职位", to: "/me/view-jobs" },
    { icon: <StarOutline />, label: "收藏", to: "/me/favorites" },
    { icon: <FileOutline />, label: "收藏的职位", to: "/me/fav-jobs" },
  ];
  if (user.role === ROLE.ENTERPRISE) {
    entries.push({ icon: <AppOutline />, label: "招聘管理", to: "/me/enterprise" });
  }
  if (user.role === ROLE.OPS) {
    entries.push({ icon: <CompassOutline />, label: "运营后台", to: "/admin" });
  }

  return (
    <div style={{ paddingBottom: 56 }}>
      {/* 顶部个人资料 */}
      <div
        style={{
          position: "relative",
          padding: "26px 16px 18px",
          background: "var(--sxu-card)",
          borderBottom: "1px solid var(--sxu-line)",
        }}
      >
        <div
          style={{ position: "absolute", top: 14, right: 14, padding: 6, cursor: "pointer", color: "var(--sxu-sub)" }}
          onClick={() => navigate("/me/settings")}
        >
          <SetOutline fontSize={20} />
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }} onClick={() => navigate("/me/profile")}>
          <Avatar u={user} size={60} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sxu-row" style={{ gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{user.nickname}</span>
              <RoleTag role={user.role} />
            </div>
            <div className="sxu-sub" style={{ marginTop: 3 }}>
              用户 ID：{user.id} · {user.role_label}
            </div>
            <div className="sxu-sub" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.bio || "这个人很懒，还没写简介"}
            </div>
          </div>
        </div>

        {/* 方块入口 */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${entries.length}, 1fr)`, gap: 8, marginTop: 16 }}>
          {entries.map((e) => (
            <div
              key={e.label}
              onClick={() => navigate(e.to)}
              style={{
                background: "var(--sxu-bg)",
                borderRadius: 12,
                padding: "13px 0 11px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 21, color: "var(--sxu-primary)", display: "flex" }}>{e.icon}</span>
              <span style={{ fontSize: 12, color: "var(--sxu-ink)" }}>{e.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 回答 / 转发 */}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k)}
        style={{ "--content-padding": "0", "--title-font-size": "15px" }}
      >
        <Tabs.Tab title="回答" key="answers">
          <MyAnswers uid={user.id} />
        </Tabs.Tab>
        <Tabs.Tab title="转发" key="reposts">
          <MyReposts uid={user.id} />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}

/** 我的回答列表 */
function MyAnswers({ uid }: { uid: number }) {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<CommentView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["my-answers", uid], queryFn: () => userApi.answers(uid, 1) });
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await userApi.answers(uid, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  if (query.isLoading) {
    return <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>;
  }
  if (list.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty style={{ padding: 24 }} description="还没有回答，去问答里帮助 TA" />
        <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/square")}>
          去广场逛逛
        </Button>
      </div>
    );
  }
  return (
    <div style={{ paddingTop: 10 }}>
      {list.map((a) => (
        <div
          key={a.id}
          className="sxu-card sxu-feed-card sxu-lazy"
          onClick={() => navigate(`/square/post/${a.post_id}`)}
        >
          <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {a.content}
          </div>
          <div className="sxu-row sxu-sub" style={{ marginTop: 8 }}>
            <span>👍 {a.like_count} · 💬 {a.reply_count} · ⭐ {a.fav_count}</span>
            <span>{timeAgo(a.created_at)}</span>
          </div>
        </div>
      ))}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}

/** 我的转发列表 */
function MyReposts({ uid }: { uid: number }) {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<PostView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["my-reposts", uid], queryFn: () => userApi.posts(uid, 1, 10, "repost") });
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await userApi.posts(uid, page + 1, 10, "repost");
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  if (query.isLoading) {
    return <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>;
  }
  if (list.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty style={{ padding: 24 }} description="还没有转发，看到有用的回答可以转发给更多人" />
        <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/square")}>
          去广场逛逛
        </Button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
      {list.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}
