import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Button } from "antd-mobile";
import { userApi } from "@/api/user";
import { useJobFilters, emptyFilters, type JobFilters } from "@/stores/filters";

function ChipGroup({
  title,
  options,
  value,
  onPick,
}: {
  title: string;
  options: { v: string | number; label: string }[];
  value: string | number;
  onPick: (v: string | number) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, color: "var(--sxu-sub)", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const active = o.v === value;
          return (
            <span
              key={String(o.v)}
              onClick={() => onPick(active ? (typeof o.v === "number" ? 0 : "") : o.v)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 14,
                border: `1px solid ${active ? "var(--sxu-primary)" : "var(--sxu-line)"}`,
                color: active ? "var(--sxu-primary)" : "var(--sxu-ink)",
                background: active ? "var(--sxu-primary-weak)" : "var(--sxu-card)",
              }}
            >
              {o.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** 筛选页（独立页面，替代弹层；确定后自动返回来源页并生效） */
export default function FilterSelect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ctx = params.get("ctx") || "home";
  const saved = useJobFilters((s) => s.byCtx[ctx]);
  const setFilters = useJobFilters((s) => s.setFilters);
  const { data: dicts } = useQuery({
    queryKey: ["dicts"],
    queryFn: userApi.dicts,
    staleTime: Infinity,
  });

  const [draft, setDraft] = useState<JobFilters>(saved ?? emptyFilters);
  useEffect(() => {
    if (saved) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  const confirm = () => {
    setFilters(ctx, draft);
    navigate(-1);
  };

  // 重置仅清空本页筛选维度；城市在独立页面选择
  const reset = () => setDraft({ ...emptyFilters, city: draft.city });

  return (
    <div style={{ paddingBottom: 90 }}>
      <NavBar onBack={goBack}>筛选</NavBar>

      <div className="sxu-card">
        {dicts && (
          <>
            <ChipGroup
              title="学历要求"
              options={(dicts.educations ?? []).map((o) => ({ v: o.value, label: o.label }))}
              value={draft.education}
              onPick={(v) => setDraft({ ...draft, education: v as number })}
            />
            <ChipGroup
              title="经验要求"
              options={(dicts.experiences ?? []).filter((o) => o.value > 1).map((o) => ({ v: o.value, label: o.label }))}
              value={draft.experience}
              onPick={(v) => setDraft({ ...draft, experience: v as number })}
            />
            <ChipGroup
              title="薪资范围"
              options={(dicts.salary_buckets ?? []).map((b) => ({ v: b.label, label: b.label }))}
              value={draft.salary}
              onPick={(v) => setDraft({ ...draft, salary: v as string })}
            />
            <ChipGroup
              title="行业"
              options={(dicts.industries ?? []).map((s) => ({ v: s, label: s }))}
              value={draft.industry}
              onPick={(v) => setDraft({ ...draft, industry: v as string })}
            />
            <ChipGroup
              title="公司规模"
              options={(dicts.sizes ?? []).map((s) => ({ v: s, label: s }))}
              value={draft.size}
              onPick={(v) => setDraft({ ...draft, size: v as string })}
            />
            <ChipGroup
              title="融资阶段"
              options={(dicts.fundings ?? []).map((s) => ({ v: s, label: s }))}
              value={draft.funding}
              onPick={(v) => setDraft({ ...draft, funding: v as string })}
            />
          </>
        )}
      </div>

      <div className="sxu-footer-bar">
        <Button block fill="outline" size="large" style={{ "--border-radius": "24px" }} onClick={reset}>
          重置
        </Button>
        <Button block color="primary" size="large" style={{ "--border-radius": "24px" }} onClick={confirm}>
          确定
        </Button>
      </div>
    </div>
  );
}
