import { useNavigate } from "react-router";
import { SearchBar } from "antd-mobile";
import { LeftOutline } from "antd-mobile-icons";

/** 搜索页头：左返回 + 搜索框 + 右"搜索"按钮（搜索页与搜索结果页共用） */
export function SearchHeader({
  value,
  onChange,
  onSubmit,
  placeholder = "搜索职位、公司",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--sxu-card)",
        borderBottom: "1px solid var(--sxu-line)",
      }}
    >
      <LeftOutline onClick={goBack} style={{ fontSize: 22, color: "var(--sxu-ink)", flexShrink: 0 }} />
      <SearchBar
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onSearch={onSubmit}
        onClear={() => onChange("")}
        style={{ "--background": "var(--sxu-bg)", flex: 1 }}
      />
      <a
        className="sxu-link"
        onClick={() => onSubmit(value)}
        style={{ fontWeight: 600, flexShrink: 0, fontSize: 15 }}
      >
        搜索
      </a>
    </div>
  );
}
