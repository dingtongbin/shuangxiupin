import { create } from "zustand";

export interface ThemePreset {
  key: string;
  name: string;
  color: string;
}

/** 主题配色预设（默认蓝） */
export const THEME_PRESETS: ThemePreset[] = [
  { key: "blue", name: "清新蓝", color: "#1677ff" },
  { key: "green", name: "自然绿", color: "#0a9b57" },
  { key: "purple", name: "典雅紫", color: "#722ed1" },
  { key: "orange", name: "活力橙", color: "#fa8c16" },
  { key: "cyan", name: "湖光青", color: "#13c2c2" },
  { key: "magenta", name: "浪漫粉", color: "#eb2f96" },
];

const STORAGE_KEY = "sxu_theme_color";
const DEFAULT_COLOR = THEME_PRESETS[0].color;

export function loadThemeColor(): string {
  try {
    const c = localStorage.getItem(STORAGE_KEY);
    if (c && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
  } catch {
    /* ignore */
  }
  return DEFAULT_COLOR;
}

/** 把主题色写入 CSS 变量（antd-mobile 全组件跟随） */
export function applyThemeColor(color: string) {
  document.documentElement.style.setProperty("--sxu-primary", color);
}

interface ThemeState {
  color: string;
  setColor: (color: string) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  color: loadThemeColor(),
  setColor: (color) => {
    try {
      localStorage.setItem(STORAGE_KEY, color);
    } catch {
      /* ignore */
    }
    applyThemeColor(color);
    set({ color });
  },
}));

// 应用启动时立即生效（App 挂载前调用）
applyThemeColor(loadThemeColor());

// ---------- 深浅模式（黑白夜）：跟随系统 / 浅色 / 深色 ----------

export type ThemeMode = "auto" | "light" | "dark";

export const THEME_MODES: { key: ThemeMode; name: string }[] = [
  { key: "auto", name: "跟随系统" },
  { key: "light", name: "浅色" },
  { key: "dark", name: "深色" },
];

const MODE_KEY = "sxu_theme_mode";

export function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

/** 按当前偏好把深浅写进 <html>（antd-mobile 官方暗色变量与 --sxu-* 暗色组随之生效） */
export function applyThemeMode() {
  const mode = loadThemeMode();
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.prefersColorScheme = dark ? "dark" : "light";
}

// 系统深浅变化时，"跟随系统"要实时切换（设置页改偏好后也会调用）
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (loadThemeMode() === "auto") applyThemeMode();
  });
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyThemeMode();
}
