import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Form, Input, message } from "antd";
import { authApi } from "@/api/sys";
import { ApiError } from "@/api/client";

/** 首登强制修改初始密码 */
export default function ForceChange() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = async (values: { old: string; next: string; confirm: string }) => {
    if (values.next !== values.confirm) {
      message.error("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(values.old, values.next);
      message.success("密码已修改，请使用新密码重新登录");
      await authApi.logout().catch(() => {});
      navigate("/login", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card style={{ width: 420 }} title="请先修改初始密码">
        <p style={{ color: "#999", fontSize: 13, marginTop: 0 }}>
          为保障安全，首次登录必须设置新密码（8 位以上，包含字母和数字）。
        </p>
        <Form layout="vertical" onFinish={submit}>
          <Form.Item name="old" rules={[{ required: true, message: "请输入当前密码" }]}>
            <Input.Password placeholder="当前密码" />
          </Form.Item>
          <Form.Item name="next" rules={[{ required: true, message: "请输入新密码" }]}>
            <Input.Password placeholder="新密码" />
          </Form.Item>
          <Form.Item name="confirm" rules={[{ required: true, message: "请再次输入新密码" }]}>
            <Input.Password placeholder="确认新密码" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={loading}>
            修改并重新登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
