import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Input, Toast, NavBar } from "antd-mobile";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/stores/auth";
import { CodeSender } from "./Register";

/** 找回密码：邮箱验证码重置 */
export default function Forgot() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !code || !password) {
      Toast.show("请填写完整信息");
      return;
    }
    setLoading(true);
    try {
      const u = await authApi.reset(email.trim().toLowerCase(), code.trim(), password);
      setUser(u);
      Toast.show({ content: "密码已重置", position: "bottom" });
      navigate("/", { replace: true });
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
      <NavBar onBack={goBack}>找回密码</NavBar>
      <div style={{ padding: "0 28px" }}>
      <div style={{ marginTop: 40 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>找回密码</h1>
        <p className="sxu-sub" style={{ marginTop: 6 }}>通过注册邮箱验证码重置密码</p>
      </div>
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          placeholder="注册邮箱"
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
          <CodeSender email={email} purpose="reset" />
        </div>
        <Input
          placeholder="新密码（8位以上，含字母和数字）"
          type="password"
          value={password}
          onChange={setPassword}
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
          重置密码
        </Button>
      </div>
      <div className="sxu-row" style={{ marginTop: 18 }}>
        <span className="sxu-sub">想起来了？</span>
        <a className="sxu-link" onClick={() => navigate("/login")}>去登录</a>
      </div>
      </div>
    </div>
  );
}
