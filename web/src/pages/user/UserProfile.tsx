import {useEffect, useState} from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, InfiniteScroll, DotLoading, Button, ErrorBlock } from "antd-mobile";
import { userApi } from "@/api/user";
import { PostCard, Avatar, RoleTag } from "@/components/PostCard";
import type { PostView } from "@/api/types";
import { useAuth } from "@/stores/auth";

/** 他人主页：简介、联系邮箱、作品列表、关注 */
export default function UserProfile() {
  const { id } = useParams();
  const uid = Number(id);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const { data: profile, isError: profileError } = useQuery({
    queryKey: ["user-profile", uid],
    queryFn: () => userApi.profile(uid),
    enabled: !!uid,
    retry: false,
  });

  const [extra, setExtra] = useState<PostView[]>([]);
  const [hasMore, setHasMore] = useState(false);


  const [page, setPage] = useState(1);
  const posts = useQuery({
    queryKey: ["user-posts", uid],
    queryFn: () => userApi.posts(uid, 1),
    enabled: !!uid,
  });
  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (posts.data) setHasMore(posts.data.has_more);
  }, [posts.data]);

  if (profileError) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>主页</NavBar>
        <ErrorBlock status="default" title="用户不存在或已注销" description="该账号无法查看" />
      </div>
    );
  }
  if (!profile) {
    return <div style={{ paddingTop: 120, textAlign: "center", color: "var(--sxu-sub)" }}><DotLoading color="primary" /></div>;
  }

  const list = [...(posts.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await userApi.posts(uid, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
    
  };

  const isSelf = user?.id === profile.id;

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>主页</NavBar>

      <div style={{ padding: "20px 16px", background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar u={profile} size={60} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {profile.nickname}
              <RoleTag role={profile.role} />
            </div>
            <div className="sxu-sub" style={{ marginTop: 2 }}>{profile.role_label}</div>
          </div>
          {!isSelf && user && (
            <Button
              size="small"
              color={profile.following ? "default" : "primary"}
              shape="rounded"
              onClick={async () => {
                const res = await userApi.toggleFollow(uid).catch(() => null);
                if (res) navigate(0);
              }}
            >
              {profile.following ? "已关注" : "+ 关注"}
            </Button>
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 14 }}>{profile.bio || "这个人很懒，还没写简介"}</div>
        <div className="sxu-sub" style={{ marginTop: 4 }}>联系邮箱：{profile.contact_email || "未填写"}</div>
        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          <Stat label="作品" value={profile.post_count} />
          <Stat label="粉丝" value={profile.follower_count} />
          <Stat label="关注" value={profile.following_count} />
        </div>
      </div>

      <div style={{ fontWeight: 600, padding: "14px 16px 4px" }}>作品</div>
      {posts.isLoading ? (
        <Center><DotLoading color="primary" /></Center>
      ) : list.length === 0 ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 32 }}>还没有作品</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 0 4px" }}>
            {list.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
      <b style={{ fontSize: 17 }}>{value}</b>
      <span className="sxu-sub">{label}</span>
    </span>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 24 }}>{children}</div>;
}
