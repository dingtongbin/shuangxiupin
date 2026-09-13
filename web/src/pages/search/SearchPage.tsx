import { useState } from "react";
import { useNavigate } from "react-router";
import { Dialog } from "antd-mobile";
import { SearchHeader } from "@/components/SearchHeader";
import { DeleteOutline } from "antd-mobile-icons";

const HISTORY_KEY = "sxu_search_history";

export function readHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function pushHistory(kw: string) {
  const k = kw.trim();
  if (!k) return;
  const list = readHistory().filter((h) => h !== k);
  list.unshift(k);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 15)));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/** 搜索页：页头即搜索框（左返回 / 右搜索）+ 可删除的历史搜索 */
export default function SearchPage() {
  const navigate = useNavigate();
  const [kw, setKw] = useState("");
  const [history, setHistory] = useState<string[]>(readHistory());

  const go = (keyword: string) => {
    const k = keyword.trim();
    if (!k) return;
    pushHistory(k);
    navigate(`/search/result?kw=${encodeURIComponent(k)}`);
  };

  const removeOne = (k: string) => {
    const next = history.filter((h) => h !== k);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const clearAll = () => {
    Dialog.confirm({
      content: "确定清空全部搜索记录？清空后不可恢复",
      cancelText: "取消",
      confirmText: "清空",
      onConfirm: () => {
        clearHistory();
        setHistory([]);
      },
    });
  };

  return (
    <div>
      <SearchHeader value={kw} onChange={setKw} onSubmit={go} autoFocus />

      {history.length > 0 && (
        <div className="sxu-card">
          <div className="sxu-row" style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>历史搜索</span>
            <a
              className="sxu-sub"
              onClick={clearAll}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}
            >
              <DeleteOutline fontSize={14} />
              清空搜索记录
            </a>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {history.map((h) => (
              <span
                key={h}
                onClick={() => go(h)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "var(--sxu-card)",
                  border: "1px solid var(--sxu-line)",
                  fontSize: 13,
                }}
              >
                {h}
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOne(h);
                  }}
                  style={{ color: "var(--sxu-sub)", lineHeight: 1 }}
                >
                  ×
                </a>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
