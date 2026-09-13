import { Outlet, useLocation, useNavigate } from "react-router";
import { Layout, Menu, Dropdown, Space, theme } from "antd";
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
  SoundOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import type { SelfView } from "@/api/sys";
import { authApi } from "@/api/sys";



export default function BasicLayout({ me }: { me: SelfView }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const has = (perm: string) => (me.perms ?? []).includes(perm);
  const items = [
    { key: "/", icon: <TeamOutlined />, label: "用户管理" },
    { key: "/roles", icon: <SafetyCertificateOutlined />, label: "角色与权限" },
    { key: "/domains", icon: <MailOutlined />, label: "邮箱白名单" },
    { key: "/announcements", icon: <SoundOutlined />, label: "系统公告" },
    { key: "/configs", icon: <SettingOutlined />, label: "系统参数" },
  ].filter((item) => {
    const need: Record<string, string> = {
      "/roles": "role.manage",
      "/configs": "config.manage",
    };
    return !need[item.key] || has(need[item.key]);
  });

  const logout = async () => {
    await authApi.logout().catch(() => {});
    navigate("/login", { replace: true });
  };

  // 整页 100vh 不滚动：侧边菜单与页头固定，仅内容区滚动
  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Layout.Sider theme="dark" width={208} style={{ height: "100vh", overflow: "auto" }}>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            padding: "18px 16px",
            letterSpacing: 1,
          }}
        >
          双休聘 · 系统管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            background: token.colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingInline: 24,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "退出登录",
                  onClick: logout,
                },
              ],
            }}
          >
            <Space style={{ cursor: "pointer" }}>
              <UserOutlined />
              {me.nickname}（{me.role_label}）
            </Space>
          </Dropdown>
        </Layout.Header>
        <Layout.Content
          style={{
            margin: 16,
            height: "calc(100vh - 64px)",
            overflow: "auto",
            scrollbarGutter: "stable",
          }}
        >
          <div
            style={{
              background: token.colorBgContainer,
              borderRadius: 8,
              padding: 20,
              minHeight: "100%",
            }}
          >
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
