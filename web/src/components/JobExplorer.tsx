import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { InfiniteScroll, PullToRefresh, DotLoading, ErrorBlock } from "antd-mobile";
import { FilterOutline, LocationOutline } from "antd-mobile-icons";
import { jobApi } from "@/api/job";
import type { JobView } from "@/api/types";
import { JobCard } from "./JobCard";
import { useJobFilters, emptyFilters, filtersCount } from "@/stores/filters";

/**
 * 首页与搜索结果共用的职位列表：筛选栏（最新/城市/筛选）。
 * 城市与筛选均为独立页面（/city、/filter），选择结果经 useJobFilters 带回，
 * 弹层改为整页以便低性能手机流畅使用。
 */
export function JobExplorer({ kw, ctx }: { kw: string; ctx: "home" | "search" }) {
  const navigate = useNavigate();
  const filters = useJobFilters((s) => s.byCtx[ctx] ?? emptyFilters);

  const queryParams = useMemo(
    () => ({
      kw: kw || undefined,
      city: filters.city || undefined,
      education: filters.education > 1 ? filters.education : undefined,
      experience: filters.experience > 1 ? filters.experience : undefined,
      industry: filters.industry || undefined,
      size: filters.size || undefined,
      funding: filters.funding || undefined,
      salary: filters.salary || undefined,
    }),
    [kw, filters],
  );

  const query = useQuery({
    queryKey: ["jobs", ctx, queryParams],
    queryFn: () => jobApi.list({ ...queryParams, page: 1, page_size: 10 }),
  });

  const [extra, setExtra] = useState<JobView[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // 首页数据变化时同步 hasMore
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  // 筛选/关键词变化时重置分页
  useEffect(() => {
    setExtra([]);
    setPage(1);
    setHasMore(true);
  }, [queryParams]);

  const firstPage = query.data?.list ?? [];
  const list = [...firstPage, ...extra];

  const loadMore = async (): Promise<void> => {
    const more = await jobApi.list({ ...queryParams, page: page + 1, page_size: 10 });
    setExtra((prev) => [...prev, ...more.list]);
    setPage((p) => p + 1);
    setHasMore(more.has_more);
  };

  const activeCount = filtersCount(filters);

  return (
    <div>
      {/* 筛选栏：最新（当前唯一排序）/ 城市 / 筛选 → 均跳独立页面 */}
      <div
        className="sxu-row"
        style={{
          padding: "8px 12px",
          background: "var(--sxu-bg)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sxu-primary)" }}>最新</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 3, color: filters.city ? "var(--sxu-primary)" : "var(--sxu-ink)" }}
            onClick={() => navigate(`/city?ctx=${ctx}`)}
          >
            <LocationOutline fontSize={13} />
            {filters.city || "城市"}
          </span>
          <span
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 3, color: activeCount > 0 ? "var(--sxu-primary)" : "var(--sxu-ink)" }}
            onClick={() => navigate(`/filter?ctx=${ctx}`)}
          >
            <FilterOutline fontSize={13} />
            筛选{activeCount > 0 ? ` · ${activeCount}` : ""}
          </span>
        </div>
      </div>

      <PullToRefresh
        onRefresh={async () => {
          setExtra([]);
          setPage(1);
          setHasMore(true);
          await query.refetch();
        }}
      >
        <div style={{ paddingTop: 4 }}>
          {query.isLoading ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--sxu-sub)" }}>
              <DotLoading color="primary" /> 加载中
            </div>
          ) : query.isError ? (
            <ErrorBlock status="default" title="加载失败" description="请下拉重试" />
          ) : list.length === 0 ? (
            <ErrorBlock status="empty" title="暂无职位" description="换个筛选条件或城市看看" />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 0 4px" }}>
                {list.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
