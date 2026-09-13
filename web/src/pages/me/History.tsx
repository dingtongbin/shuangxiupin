import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, DotLoading, InfiniteScroll, Empty, Dialog, Button } from "antd-mobile";
import { FileOutline, ContentOutline, DeleteOutline } from "antd-mobile-icons";
import { userApi } from "@/api/user";
import type { HistoryItem } from "@/api/types";
import { timeAgo } from "@/components/PostCard";

/** 浏览记录：最近浏览的问答与职位，可一键清空 */
export default function History() {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const query = useQuery({ queryKey: ["my-history", refresh], queryFn: () => userApi.history(1) });
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await userApi.history(page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  const clear = () => {
    Dialog.confirm({
      content: "清空全部浏览记录？",
      onConfirm: async () => {
        await userApi.clearHistory().catch(() => null);
        setExtra([]);
        setPage(1);
        setRefresh((r) => r + 1);
      },
    });
  };

  return (
    <div>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          list.length > 0 ? (
            <a style={{ fontSize: 13, color: "var(--sxu-sub)", display: "inline-flex", alignItems: "center", gap: 3 }} onClick={clear}>
              <DeleteOutline fontSize={14} /> 清空
            </a>
          ) : (
            <span />
          )
        }
      >
        浏览记录
      </NavBar>

      {query.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty style={{ padding: 24 }} description="还没有浏览记录" />
          <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/")}>
            去看看职位
          </Button>
        </div>
      ) : (
        <div className="sxu-card" style={{ padding: "2px 14px", margin: "10px 8px" }}>
          {list.map((h) => (
            <div
              key={`${h.target_type}-${h.target_id}`}
              className="sxu-lazy"
              style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--sxu-line)" }}
              onClick={() => navigate(h.target_type === 4 ? `/jobs/${h.target_id}` : `/square/post/${h.target_id}`)}
            >
              <span
                style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                  background: h.target_type === 4 ? "var(--sxu-primary-weak)" : "var(--sxu-bg)",
                  color: h.target_type === 4 ? "var(--sxu-primary)" : "var(--sxu-sub)",
                }}
              >
                {h.target_type === 4 ? <FileOutline /> : <ContentOutline />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.title}
                </div>
                <div className="sxu-sub" style={{ marginTop: 2 }}>
                  {h.sub}
                </div>
              </div>
              <span className="sxu-sub" style={{ fontSize: 12, flexShrink: 0 }}>{timeAgo(h.updated_at)}</span>
            </div>
          ))}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </div>
      )}
    </div>
  );
}
