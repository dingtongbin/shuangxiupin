import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, DotLoading, InfiniteScroll, Empty, Button } from "antd-mobile";
import { jobApi } from "@/api/job";
import type { JobView } from "@/api/types";
import { JobCard } from "@/components/JobCard";

/** 收藏的职位 */
export default function FavJobs() {
  const navigate = useNavigate();
  const [extra, setExtra] = useState<JobView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["my-fav-jobs"], queryFn: () => jobApi.myFavorites(1) });
  useEffect(() => {
    if (query.data) setHasMore(query.data.has_more);
  }, [query.data]);

  const list = [...(query.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await jobApi.myFavorites(page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>收藏的职位</NavBar>
      {query.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : list.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty style={{ padding: 24 }} description="还没有收藏职位，去职位详情点⭐收藏" />
          <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/")}>
            去看看职位
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
          {list.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </div>
      )}
    </div>
  );
}
