import { useState } from "react";
import { useNavigate } from "react-router";
import { NavBar, Input, Button, Toast } from "antd-mobile";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";

/** 修改密码（账号与安全） */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
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
      Toast.show("两次新密码不一致");
      return;
    }
    setLoading(true);
    const ok = await authApi.changePassword(oldPwd, newPwd).catch((e) => {
      if (e instanceof ApiError) Toast.show(e.message);
      return null;
    });
    setLoading(false);
    if (ok !== null) {
      Toast.show({ content: "密码已修改", position: "bottom" });
      navigate(-1);
    }
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>修改密码</NavBar>
      <div className="sxu-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          placeholder="当前密码"
          type="password"
          value={oldPwd}
          onChange={setOldPwd}
          style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
        />
        <Input
          placeholder="新密码（8位以上，含字母和数字）"
          type="password"
          value={newPwd}
          onChange={setNewPwd}
          style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
        />
        <Input
          placeholder="确认新密码"
          type="password"
          value={confirm}
          onChange={setConfirm}
          style={{ padding: "10px 0", borderBottom: "1px solid var(--sxu-line)" }}
          onEnterPress={submit}
        />
        <Button block color="primary" size="large" loading={loading} onClick={submit} style={{ "--border-radius": "24px" }}>
          保存
        </Button>
      </div>
    </div>
  );
}
