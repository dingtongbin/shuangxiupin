import { create } from "zustand";

export interface JobFilters {
  city: string;
  education: number; // 0/1 = 不限
  experience: number;
  industry: string;
  size: string;
  funding: string;
  salary: string;
}

export const emptyFilters: JobFilters = {
  city: "",
  education: 0,
  experience: 0,
  industry: "",
  size: "",
  funding: "",
  salary: "",
};

const STORAGE_KEY = "sxu_job_filters";

function load(): Record<string, JobFilters> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, JobFilters>;
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * 职位筛选状态：按页面上下文（home=首页 / search=搜索结果）隔离，
 * 供独立的 /city、/filter 页面写入后返回时生效。
 */
interface FiltersState {
  byCtx: Record<string, JobFilters>;
  setFilters: (ctx: string, f: JobFilters) => void;
}

export const useJobFilters = create<FiltersState>((set, get) => ({
  byCtx: load(),
  setFilters: (ctx, f) => {
    const byCtx = { ...get().byCtx, [ctx]: f };
    set({ byCtx });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(byCtx));
    } catch {
      /* ignore */
    }
  },
}));

export function filtersCount(f: JobFilters): number {
  return [
    f.city,
    f.education > 1 ? f.education : 0,
    f.experience > 1 ? f.experience : 0,
    f.industry,
    f.size,
    f.funding,
    f.salary,
  ].filter((v) => v && v !== 0).length;
}
