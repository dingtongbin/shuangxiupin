import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Button, Divider, Tag, DotLoading, Toast } from "antd-mobile";
import { RightOutline, StarOutline, StarFill, PhoneFill, MailOutline } from "antd-mobile-icons";
import { jobApi } from "@/api/job";
import { Avatar, RoleTag } from "@/components/PostCard";
import { useAuth } from "@/stores/auth";

/** 职位详情：基础信息 + 描述 + 联系方式 + 收藏 */
export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobApi.detail(Number(id)),
    enabled: !!id,
  });
  const [faved, setFaved] = useState<boolean | null>(null);

  if (isLoading || !job) {
    return (
      <div style={{ paddingTop: 120, textAlign: "center", color: "var(--sxu-sub)" }}>
        {isLoading ? <DotLoading color="primary" /> : "职位不存在或已下架"}
      </div>
    );
  }
  const shownFaved = faved ?? job.favorited;

  const toggleFav = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/jobs/${id}`)}`);
      return;
    }
    const res = await jobApi.favorite(job.id).catch(() => null);
    if (res) {
      setFaved(res.favorited);
      Toast.show(res.favorited ? "已收藏" : "已取消收藏");
    }
  };

  return (
    <div style={{ paddingBottom: 70 }}>
      <NavBar onBack={() => navigate(-1)}>职位详情</NavBar>
      <div className="sxu-card">
        <div className="sxu-row" style={{ alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.3 }}>{job.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ color: "var(--sxu-primary)", fontWeight: 700, fontSize: 18, whiteSpace: "nowrap" }}>
              {job.salary_text}
            </div>
            <a
              onClick={(e) => { e.stopPropagation(); toggleFav(); }}
              style={{ color: shownFaved ? "var(--sxu-primary)" : "var(--sxu-sub)", display: "flex", padding: 4 }}
            >
              {shownFaved ? <StarFill fontSize={22} /> : <StarOutline fontSize={22} />}
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <Tag color="default" style={{ "--background-color": "var(--sxu-bg)", "--text-color": "var(--sxu-ink)", "--border-color": "transparent", fontSize: 12 }}>{job.education_label}</Tag>
          <Tag color="default" style={{ "--background-color": "var(--sxu-bg)", "--text-color": "var(--sxu-ink)", "--border-color": "transparent", fontSize: 12 }}>{job.experience_label}</Tag>
          {job.company_industry && <Tag color="default" style={{ "--background-color": "var(--sxu-bg)", "--text-color": "var(--sxu-ink)", "--border-color": "transparent", fontSize: 12 }}>{job.company_industry}</Tag>}
        </div>
        <div className="sxu-row" style={{ marginTop: 12 }}>
          <span className="sxu-sub">{job.region_text}</span>
          <span className="sxu-sub" />
        </div>
      </div>

      {/* 发布者：独立小卡片，点击进入其主页 */}
      <div className="sxu-card sxu-lazy" style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px" }} onClick={() => navigate(`/users/${job.publisher.id}`)}>
        <Avatar u={job.publisher} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sxu-row">
            <span style={{ fontWeight: 600, fontSize: 15, display: "inline-flex", alignItems: "center" }}>
              {job.publisher.nickname}
              <RoleTag role={job.publisher.role} />
            </span>
          </div>
          <div className="sxu-sub" style={{ marginTop: 2 }}>招聘者 · 点击查看主页</div>
        </div>
        <RightOutline fontSize={14} color="var(--sxu-sub)" />
      </div>

      <div className="sxu-card" onClick={() => navigate(`/square/company/${job.company.id}`)}>
        <div className="sxu-row">
          <div>
            <div style={{ fontWeight: 600 }}>{job.company.name}</div>
            <div className="sxu-sub" style={{ marginTop: 4 }}>
              {[job.company_funding, job.company_size].filter(Boolean).join(" ")}
            </div>
          </div>
          <span className="sxu-sub" style={{ display: "inline-flex", alignItems: "center" }}>
            查看点评 <RightOutline fontSize={11} />
          </span>
        </div>
      </div>

      <div className="sxu-card">
        {(job.work_cycle || job.work_days_week > 0 || job.work_hours || job.recruit_start || job.recruit_end) && (
          <div style={{ marginBottom: 12 }}>
            {[
              { label: "工作周期", value: job.work_cycle },
              { label: "每周工作", value: job.work_days_week > 0 ? `每周 ${job.work_days_week} 天` : "" },
              { label: "每天工作时间", value: job.work_hours },
              { label: "招聘开始", value: job.recruit_start },
              { label: "招聘截止", value: job.recruit_end },
            ]
              .filter((r) => r.value)
              .map((r) => (
                <div key={r.label} className="sxu-row" style={{ padding: "7px 0", fontSize: 14 }}>
                  <span className="sxu-sub" style={{ width: 96, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ flex: 1 }}>{r.value}</span>
                </div>
              ))}
            <Divider style={{ margin: "8px 0" }} />
          </div>
        )}
        <div style={{ fontWeight: 600, marginBottom: 10 }}>职位描述</div>
        <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--sxu-ink)" }}>
          {job.description || "该职位暂未填写详细描述。"}
        </div>
        <Divider style={{ margin: "14px 0 10px" }} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>投递方式</div>
        {job.contact_email || job.contact_phone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
            {job.contact_email && (
              <a className="sxu-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} href={"mailto:" + job.contact_email}>
                <MailOutline fontSize={15} /> {job.contact_email}
              </a>
            )}
            {job.contact_phone && (
              <a className="sxu-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} href={"tel:" + job.contact_phone}>
                <PhoneFill fontSize={15} /> {job.contact_phone}
              </a>
            )}
          </div>
        ) : (
          <div className="sxu-sub">发布者未留投递方式，可前往公司点评页进一步了解</div>
        )}
      </div>

      <div className="sxu-footer-bar">
        <Button
          block
          color="primary"
          size="large"
          style={{ "--border-radius": "24px" }}
          onClick={() => {
            if (!user) {
              navigate(`/login?redirect=${encodeURIComponent(`/jobs/${id}`)}`);
              return;
            }
            navigate(`/square/company/${job.company.id}`);
          }}
        >
          查看公司点评
        </Button>
      </div>
    </div>
  );
}
