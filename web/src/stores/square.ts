import { create } from "zustand";

/** 广场当前标签：用 zustand 全局状态 + localStorage 持久化，
 *  从详情页返回或重进应用后精确恢复（关注 / 问答 / 点评）。 */
export type SquareTab = "follow" | "posts" | "reviews";

const KEY = "sxu_square_tab";

function loadTab(): SquareTab {
  const v = localStorage.getItem(KEY);
  return v === "follow" || v === "posts" || v === "reviews" ? v : "posts";
}

interface SquareState {
  tab: SquareTab;
  setTab: (t: SquareTab) => void;
}

export const useSquare = create<SquareState>((set) => ({
  tab: loadTab(),
  setTab: (t) => {
    localStorage.setItem(KEY, t);
    set({ tab: t });
  },
}));
