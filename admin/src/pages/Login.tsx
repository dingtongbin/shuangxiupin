import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { authApi } from "@/api/sys";
import { ApiError } from "@/api/client";

/** PC 控制台登录：仅接受系统管理员账号 */
export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const submit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const u = await authApi.login(values.email.trim().toLowerCase(), values.password);
      if (u.role !== 4) {
        await authApi.logout().catch(() => {});
        message.error("该控制台仅限系统管理员使用");
        return;
      }
      // 刷新会话查询后进入控制台，避免守卫用过期的 401 状态弹回登录页
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo.png?v=1"
            alt="双休聘"
            style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 12 }}
          />
          <div style={{ fontSize: 22, fontWeight: 700 }}>双休聘 · 系统管理控制台</div>
          <div style={{ color: "#999", marginTop: 6, fontSize: 13 }}>
            仅限内网访问 · 系统管理员专用
          </div>
        </div>
        <Form layout="vertical" onFinish={submit} autoComplete="off">
          <Form.Item name="email" rules={[{ required: true, message: "请输入邮箱" }]}>
            <Input size="large" prefix={<MailOutlined />} placeholder="邮箱" autoFocus />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
