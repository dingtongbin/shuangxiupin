import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// 全局错误记录（最早安装，渲染崩溃可从 window.__errs 读取）
(window as unknown as { __errs: string[] }).__errs = [];
window.addEventListener("error", (e) => {
  (window as unknown as { __errs: string[] }).__errs.push(
    "ERR: " + e.message + " || " + String(e.error?.stack ?? "").slice(0, 800),
  );
});
window.addEventListener("unhandledrejection", (e) => {
  (window as unknown as { __errs: string[] }).__errs.push(
    "REJECT: " + String(e.reason?.stack ?? e.reason).slice(0, 800),
  );
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: "#1677ff" } }}>
        <AntdApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
