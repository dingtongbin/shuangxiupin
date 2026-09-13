import { useNavigate } from "react-router";
import type { CompanyView } from "@/api/types";
import { RestBadge } from "./RestBadge";

function LogoPlaceholder({ name }: { name: string }) {
  return (
    <div className="sxu-logo-badge" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
      {name.slice(0, 1)}
    </div>
  );
}

/** 广场-点评 卡片：左 logo/占位，右公司名+双休标识+标签；下方评分与点赞最多的评价 */
export function CompanyCard({ company }: { company: CompanyView }) {
  const navigate = useNavigate();
  return (
    <div className="sxu-card sxu-feed-card sxu-lazy" onClick={() => navigate(`/square/company/${company.id}`)}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {company.logo ? (
          <img
            src={company.logo}
            alt={company.name}
            loading="lazy"
            style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <LogoPlaceholder name={company.name} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sxu-row">
            <div
              style={{ fontWeight: 600, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {company.name}
            </div>
            <RestBadge type={company.rest_type} label={company.rest_label} />
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>
            {[company.industry, company.funding, company.size].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <span style={{ color: "var(--sxu-primary)", fontWeight: 700, fontSize: 18 }}>
          {company.avg_rating > 0 ? company.avg_rating.toFixed(1) : "暂无"}
        </span>
        <span className="sxu-sub">{company.rating_count} 人评分 · {company.review_count} 条评价</span>
      </div>
      {company.top_review && (
        <div
          className="sxu-sub"
          style={{
            marginTop: 6,
            background: "var(--sxu-bg)",
            borderRadius: 8,
            padding: "8px 10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          “{company.top_review.content}”
        </div>
      )}
    </div>
  );
}
