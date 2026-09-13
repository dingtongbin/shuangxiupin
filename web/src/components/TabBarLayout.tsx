import { useNavigate } from "react-router";
import { TabBar, Badge } from "antd-mobile";
import {
  AppstoreOutline,
  AppOutline,
  MessageOutline,
  UserOutline,
} from "antd-mobile-icons";
import { useAuth } from "@/stores/auth";

const tabs = [
  { key: "home", title: "首页", icon: <AppOutline />, path: "/" },
  { key: "square", title: "广场", icon: <AppstoreOutline />, path: "/square" },
  { key: "message", title: "消息", icon: <MessageOutline />, path: "/messages" },
  { key: "me", title: "我", icon: <UserOutline />, path: "/me" },
];

/** 底部导航：首页 / 广场 / 消息 / 我；未登录点消息、我 → 登录页 */
export function TabBarLayout({ active }: { active: string }) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const unread = useAuth((s) => s.unread);

  const onTab = (key: string) => {
    const tab = tabs.find((t) => t.key === key);
    if (!tab) return;
    if ((key === "message" || key === "me") && !user) {
      navigate(`/login?redirect=${encodeURIComponent(tab.path)}`);
      return;
    }
    navigate(tab.path);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        maxWidth: 480,
        margin: "0 auto",
        background: "var(--sxu-card)",
      }}
    >
      <div style={{ borderTop: "1px solid var(--sxu-line)" }}>
        <TabBar activeKey={active} onChange={onTab} safeArea>
          {tabs.map((t) => (
            <TabBar.Item
              key={t.key}
              icon={
                t.key === "message" && user && unread.total > 0 ? (
                  <Badge content={Badge.dot}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                  </Badge>
                ) : (
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                )
              }
              title={t.title}
            />
          ))}
        </TabBar>
      </div>
    </div>
  );
}
