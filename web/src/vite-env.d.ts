/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 静态托管（GitHub Pages 等）时指向自建后端，如 https://api.example.com；本地留空 */
  readonly VITE_API_BASE?: string;
}
