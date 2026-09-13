import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Button, Tag, DotLoading, Empty } from "antd-mobile";
import { jobApi } from "@/api/job";
import type { JobView } from "@/api/types";

/** 招聘管理（企业招聘用户）：我的职位列表 + 上下架 + 发布入口 */
export default function EnterpriseHome() {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const my = useQuery({
    queryKey: ["my-jobs", refresh],
    queryFn: () => jobApi.my(1, 50),
  });

  const setStatus = async (id: number, open: boolean) => {
    const ok = await (open ? jobApi.open(id) : jobApi.close(id)).catch(() => null);
    if (ok !== null) setRefresh((r) => r + 1);
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)} right={<a className="sxu-link" onClick={() => navigate("/me/enterprise/jobs/new")}>发布职位</a>}>
        招聘管理
      </NavBar>

      {my.isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><DotLoading color="primary" /></div>
      ) : my.data && my.data.list.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty style={{ padding: 24 }} description="还没有发布职位" />
          <Button block color="primary" style={{ "--border-radius": "24px" }} onClick={() => navigate("/me/enterprise/jobs/new")}>
            发布第一个职位
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
          {(my.data?.list ?? []).map((job: JobView) => (
            <div key={job.id} className="sxu-card sxu-job-card">
              <div className="sxu-row" style={{ alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{job.title}</div>
                <div style={{ color: "var(--sxu-primary)", fontWeight: 600 }}>{job.salary_text}</div>
              </div>
              <div className="sxu-sub" style={{ marginTop: 6 }}>
                {job.company.name} · {job.region_text}
              </div>
              <div className="sxu-row" style={{ marginTop: 10 }}>
                <Tag color={job.status === 1 ? "primary" : "default"} fill="outline">
                  {job.status === 1 ? "在招" : "已下架"}
                </Tag>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="small" fill="none" onClick={() => navigate(`/me/enterprise/jobs/${job.id}/edit`)}>
                    编辑
                  </Button>
                  <Button size="small" fill="none" color="danger" onClick={() => setStatus(job.id, job.status !== 1)}>
                    {job.status === 1 ? "下架" : "重新上架"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: 16 }}>
        <Button block color="primary" size="large" style={{ "--border-radius": "24px" }} onClick={() => navigate("/me/enterprise/jobs/new")}>
          + 发布职位
        </Button>
      </div>
    </div>
  );
}
