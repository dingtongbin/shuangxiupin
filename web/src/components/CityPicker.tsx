import { useMemo, useState } from "react";
import { Popup, SearchBar, IndexBar, Divider } from "antd-mobile";
import { DownOutline } from "antd-mobile-icons";
import { groupCities, searchCities } from "@/data/cities";

/** 城市选择树：A-Z 拼音首字母分组 + 支持搜索（城市名/拼音） */
export function CityPicker({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (city: string) => void;
}) {
  const [kw, setKw] = useState("");
  const groups = useMemo(() => groupCities(), []);
  const matched = useMemo(() => (kw ? searchCities(kw) : null), [kw]);

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, height: "72vh", overflow: "auto" }}
    >
      <div style={{ padding: 12 }}>
        <div className="sxu-row">
          <span style={{ fontWeight: 600 }}>选择城市</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a className="sxu-link" style={{ fontSize: 13 }} onClick={() => { onSelect(""); setKw(""); }}>
              全部城市
            </a>
            <a style={{ fontSize: 13, color: "var(--sxu-sub)" }} onClick={onClose}>
              取消
            </a>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <SearchBar
            placeholder="搜索城市名或拼音，如 chengdu"
            value={kw}
            onChange={setKw}
            clearable
          />
        </div>
        <div style={{ marginTop: 8, maxHeight: "52vh", overflow: "auto" }}>
          {matched ? (
            matched.length === 0 ? (
              <div className="sxu-sub" style={{ textAlign: "center", padding: 32 }}>未找到匹配城市</div>
            ) : (
              matched.map((c) => (
                <CityRow key={c.name} name={c.name} active={c.name === value} onClick={() => { onSelect(c.name); setKw(""); }} />
              ))
            )
          ) : (
            <IndexBar sticky>
              {groups.map((g) => (
                <IndexBar.Panel key={g.letter} index={g.letter} title={g.letter}>
                  {g.cities.map((c) => (
                    <CityRow key={c.name} name={c.name} active={c.name === value} onClick={() => { onSelect(c.name); setKw(""); }} />
                  ))}
                </IndexBar.Panel>
              ))}
            </IndexBar>
          )}
          <Divider style={{ margin: 12 }} />
        </div>
      </div>
    </Popup>
  );
}

function CityRow({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "11px 8px",
        fontSize: 15,
        color: active ? "var(--sxu-primary)" : "var(--sxu-ink)",
        fontWeight: active ? 600 : 400,
        borderBottom: "1px solid var(--sxu-line)",
      }}
    >
      {name}
    </div>
  );
}

export function SortChip({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <span onClick={onClick} style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 2 }}>
      {children}
      <DownOutline fontSize={10} />
    </span>
  );
}
