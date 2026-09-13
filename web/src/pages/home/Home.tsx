import { useNavigate } from "react-router";
import { SearchBar } from "antd-mobile";
import { JobExplorer } from "@/components/JobExplorer";

/** 首页：顶部搜索框 + 筛选栏（最新/城市/筛选）+ 职位卡片流 */
export default function Home() {
  const navigate = useNavigate();
  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 100,  padding: "10px 12px", background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              color: "var(--sxu-primary)",
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            双休聘
          </span>
          <div style={{ flex: 1 }} onClick={() => navigate("/search")}>
            <SearchBar placeholder="搜索职位、公司" style={{ "--background": "var(--sxu-bg)" }} />
          </div>
        </div>
      </div>
      <JobExplorer kw="" ctx="home" />
    </div>
  );
}
