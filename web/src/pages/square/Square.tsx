import {useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  SearchBar,
  Tabs,
  InfiniteScroll,
  PullToRefresh,
  DotLoading,
  ErrorBlock,
  Button,
} from "antd-mobile";
import { AddOutline, StarOutline, ContentOutline } from "antd-mobile-icons";
import { postApi, companyApi } from "@/api/job";
import type { CompanyView } from "@/api/types";
import { PostCard } from "@/components/PostCard";
import { CompanyCard } from "@/components/CompanyCard";
import { useAuth } from "@/stores/auth";
import { useSquare, type SquareTab } from "@/stores/square";

/** 点评筛选：默认最新（不占位），左侧两个「图标+文字」切换，再点一次取消回默认 */
const REVIEW_SORT_CHIPS = [
  { key: "rating_desc", label: "评分最高", icon: <StarOutline /> },
  { key: "count_desc", label: "评价数最多", icon: <ContentOutline /> },
] as const;
type ReviewSort = "" | (typeof REVIEW_SORT_CHIPS)[number]["key"];

/** 广场：关注 / 问答 / 点评（选中标签全局持久化，返回/重进精确恢复） */
export default function Square() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const tab = useSquare((s) => s.tab);
  const setTab = useSquare((s) => s.setTab);

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 100,  padding: "10px 12px", background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 18, flexShrink: 0, color: "var(--sxu-primary)" }}>广场</span>
          <div style={{ flex: 1 }} onClick={() => navigate("/square/search")}>
            <SearchBar placeholder="搜索问答、点评、用户" style={{ "--background": "var(--sxu-bg)" }} />
          </div>
        </div>
      </div>

      <Tabs
        activeKey={tab}
        activeLineMode="auto"
        style={{ "--title-font-size": "15px", "--content-padding": "0" }}
        onChange={(k) => setTab(k as SquareTab)}
      >
        <Tabs.Tab title="关注" key="follow">
          <FollowFeed />
        </Tabs.Tab>
        <Tabs.Tab title="问答" key="posts">
          <PostsFeed />
        </Tabs.Tab>
        <Tabs.Tab title="点评" key="reviews">
          <CompanyFeed />
        </Tabs.Tab>
      </Tabs>

      {/* 发内容入口 */}
      <div className="sxu-fab">
        <Button
          size="large"
          shape="rounded"
          color="primary"
          onClick={() => {
            if (!user) {
              navigate("/login?redirect=%2Fsquare");
              return;
            }
            navigate("/square/publish");
          }}
          style={{ boxShadow: "0 4px 14px var(--sxu-primary-shadow)" }}
        >
          <AddOutline fontSize={18} /> 提问
        </Button>
      </div>
    </div>
  );
}

function FollowFeed() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [extra, setExtra] = useState<Parameters<typeof PostCard>[0]["post"][]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["posts", "follow", user?.id],
    queryFn: () => postApi.feed("follow", 1),
    enabled: true,
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "64px 32px" }}>
        <p className="sxu-sub">登录后查看关注用户的动态</p>
        <Button color="primary" size="small" shape="rounded" onClick={() => navigate("/login?redirect=%2Fsquare")}>
          去登录
        </Button>
      </div>
    );
  }

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await postApi.feed("follow", page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };

  return (
    <PullToRefresh onRefresh={() => query.refetch()}>
      {query.isLoading ? (
        <Center><DotLoading color="primary" /></Center>
      ) : list.length === 0 ? (
        <ErrorBlock
          status="empty"
          title="还没有关注动态"
          description="去「点评」或「问答」发现感兴趣的人并关注"
        />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            {list.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </>
      )}
    </PullToRefresh>
  );
}

function PostsFeed() {
  const [extra, setExtra] = useState<Parameters<typeof PostCard>[0]["post"][]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useQuery({
    queryKey: ["posts", "latest", refreshKey],
    queryFn: () => postApi.feed("latest", 1),
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await postApi.feed("latest", page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };

  return (
    <PullToRefresh
      onRefresh={async () => {
        setExtra([]);
        setPage(1);
        setHasMore(false);
        await query.refetch();
        setRefreshKey((k) => k + 1);
      }}
    >
      {query.isLoading ? (
        <Center><DotLoading color="primary" /></Center>
      ) : list.length === 0 ? (
        <ErrorBlock status="empty" title="还没有问答" description="下拉刷新，或点右下角提第一个问题" />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            {list.map((p) => (
              <PostCard key={p.id} post={p} onChanged={() => query.refetch()} />
            ))}
          </div>
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </>
      )}
    </PullToRefresh>
  );
}

function CompanyFeed() {
  const [sort, setSort] = useState<ReviewSort>(""); // ""=默认最新
  const [extra, setExtra] = useState<CompanyView[]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["companies", sort],
    queryFn: () => companyApi.list({ sort: sort || undefined, page: 1, page_size: 10 }),
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await companyApi.list({ sort: sort || undefined, page: page + 1, page_size: 10 });
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);

  };

  return (
    <div>
      {/* 排序切换：默认最新；点亮的项再点一次取消回默认 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--sxu-card)",
          borderBottom: "1px solid var(--sxu-line)",
          padding: "9px 12px",
          display: "flex",
          justifyContent: "flex-end",
          gap: 18,
        }}
      >
        {REVIEW_SORT_CHIPS.map((c) => {
          const active = sort === c.key;
          return (
            <span
              key={c.key}
              onClick={() => {
                setSort((s) => (s === c.key ? "" : c.key));
                setExtra([]);
                setPage(1);
                setHasMore(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 13,
                lineHeight: "20px",
                color: active ? "var(--sxu-primary)" : "var(--sxu-sub)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {c.icon}
              {c.label}
            </span>
          );
        })}
      </div>
      <PullToRefresh onRefresh={() => query.refetch()}>
        {query.isLoading ? (
          <Center><DotLoading color="primary" /></Center>
        ) : list.length === 0 ? (
          <ErrorBlock status="empty" title="还没有点评主体" description="点击下方按钮创建第一个" />
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
              {list.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
            <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
          </>
        )}
      </PullToRefresh>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 48, color: "var(--sxu-sub)" }}>{children}</div>;
}
