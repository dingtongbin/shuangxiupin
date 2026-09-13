import {useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, SearchBar, CapsuleTabs, InfiniteScroll, DotLoading, Button } from "antd-mobile";
import { searchApi } from "@/api/message";
import type { UserSearchItem } from "@/api/message";
import { PostCard } from "@/components/PostCard";
import { CompanyCard } from "@/components/CompanyCard";
import { Avatar } from "@/components/PostCard";
import { userApi } from "@/api/user";
import { useAuth } from "@/stores/auth";

/** 广场搜索：帖子 / 点评 / 用户 */
export default function SquareSearch() {
  const navigate = useNavigate();
  const [kw, setKw] = useState("");
  const [submitted, setSubmitted] = useState("");

  return (
    <div>
      <NavBar back={null} onBack={() => navigate(-1)}>
        <SearchBar
          placeholder="搜索帖子、点评、用户"
          value={kw}
          onChange={setKw}
          autoFocus
          onSearch={(v) => setSubmitted(v.trim())}
          style={{ "--background": "var(--sxu-bg)" }}
        />
      </NavBar>

      {!submitted ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>
          输入关键词搜索广场内容
        </div>
      ) : (
        <CapsuleTabs defaultActiveKey="posts">
          <CapsuleTabs.Tab title="帖子" key="posts">
            <PostsResult kw={submitted} />
          </CapsuleTabs.Tab>
          <CapsuleTabs.Tab title="点评" key="companies">
            <CompaniesResult kw={submitted} />
          </CapsuleTabs.Tab>
          <CapsuleTabs.Tab title="用户" key="users">
            <UsersResult kw={submitted} />
          </CapsuleTabs.Tab>
        </CapsuleTabs>
      )}
    </div>
  );
}

function PostsResult({ kw }: { kw: string }) {
  const [extra, setExtra] = useState<Parameters<typeof PostCard>[0]["post"][]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["search-posts", kw], queryFn: () => searchApi.posts(kw, 1) });
  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await searchApi.posts(kw, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };
  if (query.isLoading) return <Center><DotLoading color="primary" /></Center>;
  if (list.length === 0) return <Empty text="没有相关帖子" />;
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        {list.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </>
  );
}

function CompaniesResult({ kw }: { kw: string }) {
  const [extra, setExtra] = useState<Parameters<typeof CompanyCard>[0]["company"][]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["search-companies", kw],
    queryFn: () => searchApi.companies(kw, "count_desc", 1),
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);
  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await searchApi.companies(kw, "count_desc", page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };
  if (query.isLoading) return <Center><DotLoading color="primary" /></Center>;
  if (list.length === 0) return <Empty text="没有相关点评主体" />;
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        {list.map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </>
  );
}

function UsersResult({ kw }: { kw: string }) {
  const [extra, setExtra] = useState<UserSearchItem[]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["search-users", kw], queryFn: () => searchApi.users(kw, 1) });
  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await searchApi.users(kw, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };
  if (query.isLoading) return <Center><DotLoading color="primary" /></Center>;
  if (list.length === 0) return <Empty text="没有相关用户" />;
  return (
    <div style={{ paddingTop: 8 }}>
      {list.map((u) => (
        <UserRow key={u.id} u={u} />
      ))}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}

function UserRow({ u }: { u: UserSearchItem }) {
  const user = useAuth((s) => s.user);
  const [following, setFollowing] = useState(u.following);
  const toggle = async () => {
    if (!user) return;
    const res = await userApi.toggleFollow(u.id).catch(() => null);
    if (res) setFollowing(res.following);
  };
  return (
    <div className="sxu-card" style={{ marginTop: 0, display: "flex", gap: 10, alignItems: "center" }}>
      <Avatar u={u} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{u.nickname}</div>
        <div className="sxu-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {u.role_label}{u.bio ? ` · ${u.bio}` : ""}
        </div>
      </div>
      {(!user || user.id !== u.id) && (
        <Button size="small" color={following ? "default" : "primary"} shape="rounded" onClick={toggle}>
          {following ? "已关注" : "关注"}
        </Button>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 40 }}>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="sxu-sub" style={{ textAlign: "center", padding: 40 }}>{text}</div>;
}
