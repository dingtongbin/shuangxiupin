import axios from "axios";
import { message } from "antd";

export interface ApiBody<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export const http = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  withCredentials: true,
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

http.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiBody;
    if (body.code !== 0) {
      if (body.code === 40100) onUnauthorized?.();
      return Promise.reject(new ApiError(body.code, body.msg));
    }
    return resp;
  },
  (err) => {
    const body = err?.response?.data as ApiBody | undefined;
    if (body?.code) {
      if (body.code === 40100) onUnauthorized?.();
      return Promise.reject(new ApiError(body.code, body.msg));
    }
    return Promise.reject(new ApiError(-1, "网络异常，请稍后再试"));
  },
);

export class ApiError extends Error {
  code: number;
  constructor(code: number, msg: string) {
    super(msg);
    this.code = code;
  }
}

/** 出错时静默返回 null（调用方用 message 提示） */
export async function call<T>(fn: () => Promise<{ data: ApiBody<T> }>): Promise<T | null> {
  try {
    const resp = await fn();
    return resp.data.data as T;
  } catch (e) {
    if (e instanceof ApiError) message.error(e.message);
    else message.error("网络异常，请稍后再试");
    return null;
  }
}
