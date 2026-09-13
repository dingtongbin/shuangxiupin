import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { NavBar, SearchBar, IndexBar, Divider } from "antd-mobile";
import { CheckOutline } from "antd-mobile-icons";
import { groupCities, searchCities } from "@/data/cities";
import { useJobFilters, emptyFilters } from "@/stores/filters";

/** 城市选择页（独立页面，替代弹层；选择后自动返回来源页） */
export default function CitySelect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ctx = params.get("ctx") || "home";
  const current = useJobFilters((s) => s.byCtx[ctx]?.city ?? "");
  const setFilters = useJobFilters((s) => s.setFilters);
  const [kw, setKw] = useState("");
  const groups = useMemo(() => groupCities(), []);
  const matched = useMemo(() => (kw.trim() ? searchCities(kw) : null), [kw]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  const pick = (city: string) => {
    const f = useJobFilters.getState().byCtx[ctx] ?? emptyFilters;
    setFilters(ctx, { ...f, city });
    navigate(-1);
  };

  return (
    <div>
      <NavBar onBack={goBack}>选择城市</NavBar>

      <div style={{ padding: "10px 12px", background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)" }}>
        <SearchBar value={kw} onChange={setKw} placeholder="搜索城市名或拼音，如 chengdu" />
      </div>

      {/* 不限城市 */}
      <div
        onClick={() => pick("")}
        className="sxu-row"
        style={{ padding: "13px 16px", background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)", fontWeight: current === "" ? 600 : 400, color: current === "" ? "var(--sxu-primary)" : "var(--sxu-ink)" }}
      >
        <span>全部城市</span>
        {current === "" && <CheckOutline color="var(--sxu-primary)" fontSize={16} />}
      </div>

      <div style={{ height: "calc(100dvh - 180px)", overflow: "auto", background: "var(--sxu-card)" }}>
        {matched ? (
          matched.length === 0 ? (
            <div className="sxu-sub" style={{ textAlign: "center", padding: 48 }}>
              未找到匹配城市
            </div>
          ) : (
            matched.map((c) => <CityRow key={c.name} name={c.name} active={c.name === current} onClick={() => pick(c.name)} />)
          )
        ) : (
          <IndexBar sticky>
            {groups.map((g) => (
              <IndexBar.Panel key={g.letter} index={g.letter} title={g.letter}>
                {g.cities.map((c) => (
                  <CityRow key={c.name} name={c.name} active={c.name === current} onClick={() => pick(c.name)} />
                ))}
              </IndexBar.Panel>
            ))}
          </IndexBar>
        )}
        <Divider style={{ margin: 0 }} />
      </div>
    </div>
  );
}

function CityRow({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="sxu-row"
      style={{
        padding: "13px 16px",
        fontSize: 15,
        borderBottom: "1px solid var(--sxu-line)",
        color: active ? "var(--sxu-primary)" : "var(--sxu-ink)",
        fontWeight: active ? 600 : 400,
      }}
    >
      <span>{name}</span>
      {active && <CheckOutline color="var(--sxu-primary)" fontSize={16} />}
    </div>
  );
}
