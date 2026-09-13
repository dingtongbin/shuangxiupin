import { useState } from "react";
import { useNavigate } from "react-router";
import { Input, Button, Toast } from "antd-mobile";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/stores/auth";

/** 首登强制改密（默认系统管理员等） */
export default function ForceChangePwd() {
  const navigate = useNavigate();
  const fetchMe = useAuth((s) => s.fetchMe);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!oldPwd || !newPwd) {
      Toast.show("请填写完整");
      return;
    }
    if (newPwd !== confirm) {
      Toast.show("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    const ok = await authApi.changePassword(oldPwd, newPwd).catch((e) => {
      if (e instanceof ApiError) Toast.show(e.message);
      return null;
    });
    setLoading(false);
    if (ok !== null) {
      const u = await fetchMe();
      Toast.show({ content: "密码已修改，欢迎使用双休聘", position: "bottom" });
      navigate(u?.role === 4 ? "/sys" : "/admin", { replace: true });
    }
  };

  return (
    <div style={{ paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img
          src="/logo.png?v=1"
          alt="双休聘"
          style={{ width: 60, height: 60, margin: "0 auto", borderRadius: 16, display: "block" }}
        />
        <h2 style={{ margin: "14px 0 4px" }}>请先修改初始密码</h2>
        <p className="sxu-sub">为保障安全，首次登录必须设置新密码</p>
      </div>
      <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Input placeholder="当前密码" type="password" value={oldPwd} onChange={setOldPwd} style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }} />
        <Input placeholder="新密码（8位以上，含字母和数字）" type="password" value={newPwd} onChange={setNewPwd} style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }} />
        <Input placeholder="确认新密码" type="password" value={confirm} onChange={setConfirm} style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }} onEnterPress={submit} />
        <Button block color="primary" size="large" loading={loading} onClick={submit} style={{ "--border-radius": "24px" }}>
          修改并进入后台
        </Button>
        <a className="sxu-link" style={{ textAlign: "center", fontSize: 13 }} onClick={async () => { await useAuth.getState().logout(); navigate("/login", { replace: true }); }}>
          改天再说（退出登录）
        </a>
      </div>
    </div>
  );
}
