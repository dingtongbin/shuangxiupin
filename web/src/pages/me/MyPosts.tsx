import {useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, InfiniteScroll, DotLoading } from "antd-mobile";
import { userApi } from "@/api/user";
import { PostCard } from "@/components/PostCard";
import type { PostView } from "@/api/types";
import { useAuth } from "@/stores/auth";

/** 我的作品（我发布的帖子），可删除 */
export default function MyPosts() {
  const navigate = useNavigate();
  const me = useAuth((s) => s.user);
  const [extra, setExtra] = useState<PostView[]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  const posts = useQuery({
    queryKey: ["my-posts", refresh],
    queryFn: () => userApi.posts(me!.id, 1),
    enabled: !!me,
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (posts.data) setHasMore(posts.data.has_more);
  }, [posts.data]);

  const list = [...(posts.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await userApi.posts(me!.id, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>我的问答</NavBar>
      {posts.isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>还没有问答，去广场提第一个问题</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
          {list.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onChanged={() => {
                setExtra([]);
                setPage(1);
                setHasMore(false);
                setRefresh((r) => r + 1);
              }}
            />
          ))}
        </div>
      )}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}
