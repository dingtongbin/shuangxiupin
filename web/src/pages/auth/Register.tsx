import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, Input, Toast, NavBar } from "antd-mobile";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/stores/auth";

function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (left > 0 && !timer.current) {
      timer.current = setInterval(() => {
        setLeft((v) => {
          if (v <= 1) {
            if (timer.current) clearInterval(timer.current);
            timer.current = null;
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [left]);
  return { left, start: () => setLeft(60) };
}

export function CodeSender({
  email,
  purpose,
}: {
  email: string;
  purpose: "register" | "reset";
}) {
  const { left, start } = useCountdown();
  const send = async () => {
    if (!email) {
      Toast.show("请先填写邮箱");
      return;
    }
    if (left > 0) return;
    const ok = await authApi.sendCode(email.trim().toLowerCase(), purpose).catch((e) => {
      if (e instanceof ApiError) Toast.show(e.message);
      return null;
    });
    if (ok !== null) {
      start();
      Toast.show({ content: "验证码已发送，请查收邮箱", position: "bottom" });
    }
  };
  return (
    <a
      className="sxu-link"
      onClick={send}
      style={{ fontSize: 14, whiteSpace: "nowrap", color: left > 0 ? "var(--sxu-sub)" : "var(--sxu-primary)" }}
    >
      {left > 0 ? `${left}s 后重发` : "获取验证码"}
    </a>
  );
}

/** 注册页：国内知名邮箱 + 6位验证码 */
export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const setUser = useAuth((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !code || !password) {
      Toast.show("请填写完整信息");
      return;
    }
    setLoading(true);
    try {
      const u = await authApi.register({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });
      setUser(u);
      Toast.show({ content: "注册成功，欢迎加入双休聘", position: "bottom" });
      navigate(redirect, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) Toast.show(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  return (
    <div>
      <NavBar onBack={goBack}>注册</NavBar>
      <div style={{ padding: "0 28px" }}>
      <div style={{ marginTop: 40 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>注册账号</h1>
        <p className="sxu-sub" style={{ marginTop: 6 }}>
          仅支持 163 / QQ / 126 等国内常用邮箱
        </p>
      </div>
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          placeholder="邮箱"
          type="email"
          value={email}
          onChange={setEmail}
          clearable
          style={{ "--font-size": "16px", padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
        />
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--sxu-line)" }}>
          <Input
            placeholder="6 位邮箱验证码"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={setCode}
            style={{ "--font-size": "16px", padding: "10px 0", flex: 1 }}
          />
          <CodeSender email={email} purpose="register" />
        </div>
        <Input
          placeholder="设置密码（8位以上，含字母和数字）"
          type="password"
          value={password}
          onChange={setPassword}
          style={{ "--font-size": "16px", padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
        />
        <Input
          placeholder="昵称（选填）"
          value={nickname}
          onChange={setNickname}
          maxLength={20}
          clearable
          style={{ "--font-size": "16px", padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
          onEnterPress={submit}
        />
        <Button
          block
          size="large"
          color="primary"
          loading={loading}
          onClick={submit}
          style={{ "--border-radius": "24px", marginTop: 8 }}
        >
          注册并登录
        </Button>
      </div>
      <div className="sxu-row" style={{ marginTop: 18 }}>
        <span className="sxu-sub">已有账号？</span>
        <a className="sxu-link" onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}>
          去登录
        </a>
      </div>
      </div>
    </div>
  );
}
