import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar, InfiniteScroll, DotLoading } from "antd-mobile";
import { messageApi } from "@/api/message";
import type { NotificationView, AnnouncementView } from "@/api/types";
import { Avatar, timeAgo } from "@/components/PostCard";

/** 消息详情：某一类消息的完整列表（点击互动/系统消息标记已读并跳转来源） */
export default function MessageDetail() {
  const { type } = useParams();
  const navigate = useNavigate();

  if (type === "announcements") {
    return <AnnouncementList />;
  }
  if (type === "interact" || type === "system") {
    return <NotificationList type={type} />;
  }
  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>消息</NavBar>
      <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>消息类型不存在</div>
    </div>
  );
}

function NotificationList({ type }: { type: "system" | "interact" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState<NotificationView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["messages", type],
    queryFn: () => messageApi.list(type, 1),
  });
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await messageApi.list(type, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  const open = async (n: NotificationView) => {
    if (!n.is_read) {
      await messageApi.markRead([n.id]).catch(() => null);
      const unread = await messageApi.unread().catch(() => null);
      if (unread) queryClient.setQueryData(["unread"], unread);
    }
    if (n.post_id > 0) navigate(`/square/post/${n.post_id}`);
    else if (n.company_id > 0) navigate(`/square/company/${n.company_id}`);
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate("/messages")}>{type === "system" ? "系统消息" : "互动消息"}</NavBar>
      {query.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>暂无{type === "system" ? "系统" : "互动"}消息</div>
      ) : (
        <div className="sxu-card sxu-lazy" style={{ padding: "2px 14px", margin: "10px 8px 0" }}>
          {list.map((n) => (
            <div
              key={n.id}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--sxu-line)", cursor: "pointer" }}
              onClick={() => open(n)}
            >
              {n.type === 1 ? (
                <div className="sxu-logo-badge" style={{ width: 40, height: 40, fontSize: 18, borderRadius: "50%", flexShrink: 0 }}>
                  官
                </div>
              ) : (
                <div onClick={(e) => { if (n.sender) { e.stopPropagation(); navigate(`/users/${n.sender.id}`); } }}>
                  <Avatar u={n.sender ?? { nickname: "用户", avatar: "" }} size={40} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sxu-row">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: n.is_read ? 400 : 600, fontSize: 14, minWidth: 0 }}>
                    {!n.is_read && <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#e0533f", flexShrink: 0 }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.type === 1 ? "双休聘官方" : n.sender?.nickname ?? "用户"}
                    </span>
                  </span>
                  <span className="sxu-sub" style={{ fontSize: 12, flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {n.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}

function AnnouncementList() {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<AnnouncementView[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["announcements"], queryFn: () => messageApi.announcements(1) });

  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await messageApi.announcements(page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <NavBar onBack={() => navigate("/messages")}>平台公告</NavBar>
      {query.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>暂无公告</div>
      ) : (
        <div className="sxu-card sxu-lazy" style={{ padding: "2px 14px", margin: "10px 8px 0" }}>
          {list.map((a) => (
            <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--sxu-line)" }}>
              <div className="sxu-row">
                <span style={{ fontWeight: 600, fontSize: 14 }}>双休聘官方</span>
                <span className="sxu-sub" style={{ fontSize: 12 }}>{timeAgo(a.created_at)}</span>
              </div>
              <div style={{ marginTop: 5, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {a.content}
              </div>
            </div>
          ))}
        </div>
      )}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}
