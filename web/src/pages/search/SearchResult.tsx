import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { SearchHeader } from "@/components/SearchHeader";
import { JobExplorer } from "@/components/JobExplorer";
import { pushHistory } from "./SearchPage";

/** 搜索结果页：与搜索页同款页头（返回+搜索框+搜索按钮）+ 筛选栏 + 职位卡片 */
export default function SearchResult() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kw = params.get("kw") || "";
  const [input, setInput] = useState(kw);

  // URL 关键词变化时同步输入框
  useEffect(() => {
    setInput(kw);
  }, [kw]);

  const go = (keyword: string) => {
    const k = keyword.trim();
    if (!k) return;
    pushHistory(k);
    if (k === kw) return; // 相同关键词不重复跳转
    navigate(`/search/result?kw=${encodeURIComponent(k)}`);
  };

  return (
    <div>
      <SearchHeader value={input} onChange={setInput} onSubmit={go} />
      <JobExplorer kw={kw} ctx="search" />
    </div>
  );
}
