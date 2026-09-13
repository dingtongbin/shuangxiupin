import { useNavigate } from "react-router";
import type { JobView } from "@/api/types";

/** 职位卡片（首页与搜索结果共用）：
 *  一/二行：左职位名（加粗略大，最多两行）+ 右侧窄列 nK-nK
 *  小字行：公司名 融资 规模；末行：左发布人 / 右三段地区 */
export function JobCard({ job }: { job: JobView }) {
  const navigate = useNavigate();
  return (
    <div
      className="sxu-card sxu-job-card sxu-lazy"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div className="sxu-row" style={{ alignItems: "flex-start" }}>
        <div
          className="sxu-ellipsis2"
          style={{
            fontWeight: 600,
            fontSize: 16,
            lineHeight: "22px",
            flex: 1,
            minWidth: 0,
          }}
        >
          {job.title}
        </div>
        <div
          style={{
            color: "var(--sxu-primary)",
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: "nowrap",
            marginLeft: 8,
            paddingTop: 1,
          }}
        >
          {job.salary_text}
        </div>
      </div>
      <div style={{ marginTop: 6 }} className="sxu-sub">
        {job.company.name}
        {job.company_funding ? ` ${job.company_funding}` : ""}
        {job.company_size ? ` ${job.company_size}` : ""}
      </div>
      <div className="sxu-row" style={{ marginTop: 6 }}>
        <span className="sxu-sub">{job.publisher.nickname}</span>
        <span className="sxu-sub">{job.region_text}</span>
      </div>
    </div>
  );
}
