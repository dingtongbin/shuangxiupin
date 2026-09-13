import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// 系统管理控制台（PC）：开发 :5174；生产构建后由后端 /console 托管
export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5174, // 系统管理控制台开发端口（API 代理到独立服务 :8090）
    proxy: {
      "/api": { target: "http://127.0.0.1:8090", changeOrigin: false },
      "/uploads": { target: "http://127.0.0.1:8080", changeOrigin: false },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
