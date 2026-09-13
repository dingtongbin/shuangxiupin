import {useEffect, useState} from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  NavBar,
  Button,
  DotLoading,
  Rate,
  InfiniteScroll,
  ErrorBlock,
  Tabs,
} from "antd-mobile";
import { companyApi, postApi, jobApi } from "@/api/job";
import { RestBadge } from "@/components/RestBadge";
import { Avatar, RoleTag, timeAgo } from "@/components/PostCard";
import { JobCard } from "@/components/JobCard";
import { useAuth } from "@/stores/auth";
import { HeartOutline } from "antd-mobile-icons";
import { ROLE } from "@/api/types";
import type { CompanyView } from "@/api/types";

/** 企业主体详情：头部资料 + 评价 / 工商信息 / 在招职位 三个标签页 */
export default function CompanyDetail() {
  const { id } = useParams();
  const companyId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState("reviews");

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyApi.detail(companyId),
    enabled: !!companyId,
  });

  if (!company) {
    return (
      <div style={{ paddingTop: 120, textAlign: "center", color: "var(--sxu-sub)" }}>
        <DotLoading color="primary" />
      </div>
    );
  }

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    queryClient.invalidateQueries({ queryKey: ["company-reviews", companyId] });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
  };

  return (
    <div style={{ paddingBottom: 70 }}>
      <NavBar onBack={() => navigate(-1)}>企业点评</NavBar>

      <div className="sxu-card">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {company.logo ? (
            <img src={company.logo} alt={company.name} loading="lazy" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div className="sxu-logo-badge" style={{ width: 56, height: 56, fontSize: 26 }}>{company.name.slice(0, 1)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sxu-row">
              <div style={{ fontWeight: 700, fontSize: 18 }}>{company.name}</div>
              <RestBadge type={company.rest_type} label={company.rest_label} />
            </div>
            <div className="sxu-sub" style={{ marginTop: 4 }}>
              {[company.industry, company.funding, company.size].filter(Boolean).join(" · ") || "资料待完善"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span style={{ color: "var(--sxu-primary)", fontSize: 30, fontWeight: 800 }}>
            {company.avg_rating > 0 ? company.avg_rating.toFixed(1) : "-"}
          </span>
          <div>
            <Rate value={company.avg_rating} readOnly allowHalf style={{ "--star-size": "14px" }} />
            <div className="sxu-sub">{company.rating_count} 人评分 · {company.review_count} 条评价</div>
          </div>
        </div>
        {user && user.role === ROLE.USER && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button
              block
              color="primary"
              shape="rounded"
              onClick={() => navigate(`/square/company/${companyId}/review`)}
            >
              写评价
            </Button>
          </div>
        )}
        {user && user.role !== ROLE.USER && user.role !== ROLE.ENTERPRISE && (
          <div className="sxu-sub" style={{ marginTop: 12 }}>管理员角色不能发表评价</div>
        )}
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ "--content-padding": "0", "--title-font-size": "15px", "--background-color": "var(--sxu-card)" } as React.CSSProperties}
      >
        <Tabs.Tab title="评价" key="reviews">
          <ReviewsTab companyId={companyId} company={company} onLike={refreshAll} />
        </Tabs.Tab>
        <Tabs.Tab title="工商信息" key="biz">
          <BizInfoTab company={company} />
        </Tabs.Tab>
        <Tabs.Tab title="在招职位" key="jobs">
          <JobsTab companyId={companyId} />
        </Tabs.Tab>
      </Tabs>

      <div className="sxu-footer-bar">
        <Button
          block
          color="primary"
          size="large"
          style={{ "--border-radius": "24px" }}
          onClick={async () => {
            if (!user) {
              navigate(`/login?redirect=${encodeURIComponent(`/square/company/${companyId}`)}`);
              return;
            }
            navigate(`/square/company/${companyId}/review`);
          }}
        >
          写评价
        </Button>
      </div>
    </div>
  );
}

/** 评价列表（最新/最热） */
function ReviewsTab({
  companyId,
  company,
  onLike,
}: {
  companyId: number;
  company: CompanyView;
  onLike: () => void;
}) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [sort, setSort] = useState<"latest" | "likes">("latest");
  const [extra, setExtra] = useState<Awaited<ReturnType<typeof companyApi.reviews>>["list"]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const reviews = useQuery({
    queryKey: ["company-reviews", companyId, sort],
    queryFn: () => companyApi.reviews(companyId, sort, 1),
    enabled: !!companyId,
  });
  useEffect(() => {
    if (reviews.data) setHasMore(reviews.data.has_more);
  }, [reviews.data]);

  const list = [...(reviews.data?.list ?? []), ...extra];
  const loadMore = async () => {
    const res = await companyApi.reviews(companyId, sort, page + 1);
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  const likeReview = async (rid: number) => {
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/square/company/${companyId}`)}`);
    const res = await postApi.toggleLike(3, rid).catch(() => null);
    if (res) onLike();
  };

  return (
    <div className="sxu-card" style={{ paddingTop: 8, paddingBottom: 8, marginTop: 10 }}>
      <div style={{ fontWeight: 600, padding: "4px 0" }}>全部评价（{company.review_count}）</div>
      <Tabs
        activeKey={sort}
        activeLineMode="auto"
        style={{ "--title-font-size": "13px", "--content-padding": "0" }}
        onChange={(k) => { setSort(k as "latest" | "likes"); setExtra([]); setPage(1); setHasMore(false); }}
      >
        <Tabs.Tab title="最新" key="latest" />
        <Tabs.Tab title="最热" key="likes" />
      </Tabs>
      {reviews.isLoading ? (
        <Center><DotLoading color="primary" /></Center>
      ) : list.length === 0 ? (
        <ErrorBlock status="empty" title="暂无评价" description="点击「写评价」分享真实体验" />
      ) : (
        <>
          {list.map((r) => (
            <div key={r.id} className="sxu-lazy" style={{ padding: "12px 0", borderBottom: "1px solid var(--sxu-line)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div onClick={() => navigate(`/users/${r.user.id}`)}>
                  <Avatar u={r.user} size={32} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sxu-row">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {r.user.nickname}
                      <RoleTag role={r.user.role} />
                    </span>
                    <span className="sxu-sub">{timeAgo(r.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <Rate value={r.overall} readOnly style={{ "--star-size": "13px" }} />
                    {Object.keys(r.dims).length > 0 && (
                      <span className="sxu-sub">
                        {Object.entries(r.dims)
                          .map(([k, v]) => `${dimLabel(k)}${v}`)
                          .join(" / ")}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {r.content}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className="sxu-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => likeReview(r.id)}>
                      <HeartOutline fontSize={14} color={r.liked ? "var(--sxu-primary)" : undefined} /> {r.like_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </>
      )}
    </div>
  );
}

/** 工商信息（企查查式资料，运营维护） */
function BizInfoTab({ company }: { company: CompanyView }) {
  const rows: { label: string; value: string }[] = [
    { label: "统一社会信用代码", value: company.credit_code },
    { label: "法定代表人", value: company.legal_person },
    { label: "注册资本", value: company.reg_capital },
    { label: "实缴资本", value: company.paid_capital },
    { label: "参保人数", value: company.insured_cnt > 0 ? `${company.insured_cnt} 人` : "" },
    { label: "成立日期", value: company.founded_on },
    { label: "主营业务", value: company.main_biz },
    { label: "行业", value: company.industry },
    { label: "公司规模", value: company.size },
    { label: "融资阶段", value: company.funding },
  ];
  return (
    <div className="sxu-card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--sxu-line)", fontSize: 14 }}
          >
            <span className="sxu-sub" style={{ width: 110, flexShrink: 0 }}>{r.label}</span>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.6, wordBreak: "break-all", color: r.value ? "var(--sxu-ink)" : "var(--sxu-sub)" }}>
              {r.value || "暂未公示"}
            </span>
          </div>
        ))}
      </div>
      <div className="sxu-sub" style={{ paddingTop: 10, fontSize: 12 }}>
        工商信息由平台运营维护，仅供参考；认证招聘者发布的职位按统一社会信用代码关联到本企业。
      </div>
    </div>
  );
}

/** 在招职位 */
function JobsTab({ companyId }: { companyId: number }) {
  const [extra, setExtra] = useState<Awaited<ReturnType<typeof jobApi.list>>["list"]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const jobs = useQuery({
    queryKey: ["company-jobs", companyId],
    queryFn: () => jobApi.list({ company_id: companyId, page: 1, page_size: 10 }),
    enabled: !!companyId,
  });
  useEffect(() => {
    if (jobs.data) setHasMore(jobs.data.has_more);
  }, [jobs.data]);

  const list = [...(jobs.data?.list ?? []), ...extra];
  const loadMore = async (): Promise<void> => {
    const res = await jobApi.list({ company_id: companyId, page: page + 1, page_size: 10 });
    setExtra((p) => [...p, ...res.list]);
    setPage((p) => p + 1);
    setHasMore(res.has_more);
  };

  if (jobs.isLoading) {
    return <Center><DotLoading color="primary" /></Center>;
  }
  if (list.length === 0) {
    return <div className="sxu-sub" style={{ textAlign: "center", padding: 40 }}>该企业暂无在招职位</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 8px 0" }}>
      {list.map((j) => (
        <JobCard key={j.id} job={j} />
      ))}
      <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
}

export function dimLabel(key: string): string {
  const map: Record<string, string> = {
    atmosphere: "氛围",
    welfare: "福利",
    intensity: "强度",
    growth: "成长",
  };
  return map[key] ?? key;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 24 }}>{children}</div>;
}
