import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, DotLoading, InfiniteScroll, Empty, Button } from "antd-mobile";
import { postApi } from "@/api/job";
import type { CommentViewType } from "@/api/job";
import { Avatar, RoleTag, timeAgo } from "@/components/PostCard";

/** 我的收藏：收藏的问答回答 */
export default function Favorites() {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<CommentViewType[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({ queryKey: ["my-favorites"], queryFn: () => postApi.myFavorites(1) });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await postApi.myFavorites(page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>我的收藏</NavBar>
      {query.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty style={{ padding: 24 }} description="还没有收藏，去问答里点⭐收藏回答" />
          <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/square")}>
            去广场逛逛
          </Button>
        </div>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {list.map((a) => (
            <div
              key={a.id}
              className="sxu-card sxu-lazy"
              style={{ marginTop: 0 }}
              onClick={() => navigate(`/square/post/${a.post_id}`)}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Avatar u={a.user} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {a.user.nickname}
                    <RoleTag role={a.user.role} />
                  </div>
                  <div className="sxu-sub">{timeAgo(a.created_at)}</div>
                </div>
                <span className="sxu-link" style={{ fontSize: 12 }}>查看问答</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {a.content}
              </div>
              <div className="sxu-row sxu-sub" style={{ marginTop: 8 }}>
                <span>⭐ 已收藏</span>
                <span>👍 {a.like_count} · 💬 {a.reply_count} · ↗ {a.repost_count}</span>
              </div>
            </div>
          ))}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </div>
      )}
    </div>
  );
}
