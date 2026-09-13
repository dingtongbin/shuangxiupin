import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Rate, TextArea, Button, Toast, Divider } from "antd-mobile";
import { companyApi } from "@/api/job";
import { userApi } from "@/api/user";

/** 写评价：总体 1-5 分 + 每个重要评分点打分 + 正文 */
export default function ReviewCreate() {
  const { id } = useParams();
  const companyId = Number(id);
  const navigate = useNavigate();
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyApi.detail(companyId),
    enabled: !!companyId,
  });
  const { data: dicts } = useQuery({ queryKey: ["dicts"], queryFn: userApi.dicts, staleTime: Infinity });

  const [overall, setOverall] = useState(0);
  const [dims, setDims] = useState<Record<string, number>>({});
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (overall < 1) {
      Toast.show("请先打总体分");
      return;
    }
    if (!content.trim()) {
      Toast.show("写点真实体验吧");
      return;
    }
    setLoading(true);
    const res = await companyApi
      .createReview(companyId, { overall, content: content.trim(), dims })
      .catch(() => null);
    setLoading(false);
    if (res) {
      Toast.show({ content: "评价发布成功", position: "bottom" });
      navigate(`/square/company/${companyId}`, { replace: true });
    }
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>写评价</NavBar>
      <div className="sxu-card">
        <div style={{ fontWeight: 600 }}>{company?.name ?? "…"}</div>
        <p className="sxu-sub" style={{ marginBottom: 0 }}>
          评价将公开显示；请基于真实经历，遵守社区规范。
        </p>

        <Divider style={{ margin: "14px 0" }} />
        <div className="sxu-row">
          <span>总体评分</span>
          <Rate value={overall} onChange={setOverall} style={{ "--star-size": "22px" }} />
        </div>

        <Divider style={{ margin: "14px 0" }} />
        {(dicts?.review_dims ?? []).map((d) => (
          <div className="sxu-row" key={d.key} style={{ padding: "6px 0" }}>
            <span style={{ fontSize: 14 }}>{d.label}</span>
            <Rate
              value={dims[d.key] ?? 0}
              onChange={(v) => setDims((prev) => ({ ...prev, [d.key]: v }))}
              style={{ "--star-size": "16px" }}
            />
          </div>
        ))}

        <Divider style={{ margin: "14px 0" }} />
        <TextArea
          placeholder="工作强度如何？真的双休吗？福利待遇、团队氛围…（1-1000 字）"
          value={content}
          onChange={setContent}
          maxLength={1000}
          rows={6}
          showCount
        />

        <Button
          block
          color="primary"
          size="large"
          loading={loading}
          onClick={submit}
          style={{ "--border-radius": "24px", marginTop: 16 }}
        >
          发布评价
        </Button>
      </div>
    </div>
  );
}
