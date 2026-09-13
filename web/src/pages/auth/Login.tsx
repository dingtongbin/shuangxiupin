import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, Input, Toast, Checkbox, NavBar } from "antd-mobile";
import { useAuth } from "@/stores/auth";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";

/** 登录页：主流手机 App 风格 */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const setUser = useAuth((s) => s.setUser);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Toast.show("请填写邮箱和密码");
      return;
    }
    setLoading(true);
    try {
      const u = await authApi.login(email.trim().toLowerCase(), password);
      setUser(u);
      Toast.show({ content: "欢迎回来", position: "bottom" });
      navigate(redirect, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) Toast.show(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <NavBar onBack={goBack}>登录</NavBar>
      <div style={{ padding: "0 28px" }}>
      <div style={{ marginTop: 48 }}>
        <img
          src="/logo.png?v=1"
          alt="双休聘"
          style={{ width: 64, height: 64, borderRadius: 16, display: "block" }}
        />
        <h1 style={{ fontSize: 24, margin: "18px 0 4px" }}>登录双休聘</h1>
        <p className="sxu-sub" style={{ margin: 0 }}>只找双休好工作，看真实企业点评</p>
      </div>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          placeholder="邮箱"
          type="email"
          value={email}
          onChange={setEmail}
          clearable
          style={{ "--font-size": "16px", padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
        />
        <Input
          placeholder="密码"
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
          登录
        </Button>
      </div>

      <div className="sxu-row" style={{ marginTop: 18 }}>
        <a className="sxu-link" onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirect)}`)}>
          注册新账号
        </a>
        <a className="sxu-link" onClick={() => navigate("/forgot")}>
          忘记密码
        </a>
      </div>

      <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, maxWidth: 480, margin: "0 auto", padding: "0 28px" }}>
        <Checkbox defaultChecked style={{ "--icon-size": "16px", fontSize: 12 }}>
          <span className="sxu-sub">
            我已阅读并同意
            <a className="sxu-link" onClick={() => navigate("/agreement")}>《用户协议》</a>
            和
            <a className="sxu-link" onClick={() => navigate("/privacy")}>《隐私政策》</a>
          </span>
        </Checkbox>
      </div>
      </div>
    </div>
  );
}
