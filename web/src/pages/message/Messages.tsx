import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BellOutline, HeartOutline, SoundOutline } from "antd-mobile-icons";
import { messageApi } from "@/api/message";
import { timeAgo } from "@/components/PostCard";

/** 消息中心：聊天列表式入口（互动 / 系统 / 公告），点击进入对应消息列表 */
export default function Messages() {
  const navigate = useNavigate();
  const unread = useQuery({ queryKey: ["unread"], queryFn: () => messageApi.unread(), refetchInterval: 30000 });
  const interact = useQuery({ queryKey: ["messages", "interact"], queryFn: () => messageApi.list("interact", 1) });
  const system = useQuery({ queryKey: ["messages", "system"], queryFn: () => messageApi.list("system", 1) });
  const ann = useQuery({ queryKey: ["announcements"], queryFn: () => messageApi.announcements(1) });

  const latest = (q: { data?: { list?: { content: string; created_at: string }[] } }) => {
    const first = q.data?.list?.[0];
    return first ? { preview: first.content, time: timeAgo(first.created_at) } : { preview: "暂无消息", time: "" };
  };

  const rows = [
    {
      key: "interact",
      icon: <HeartOutline />,
      title: "互动消息",
      ...latest(interact),
      count: unread.data?.interact ?? 0,
      to: "/messages/interact",
    },
    {
      key: "system",
      icon: <BellOutline />,
      title: "系统消息",
      ...latest(system),
      count: unread.data?.system ?? 0,
      to: "/messages/system",
    },
    {
      key: "announcements",
      icon: <SoundOutline />,
      title: "平台公告",
      ...latest(ann),
      count: 0,
      to: "/messages/announcements",
    },
  ];

  return (
    <div>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "14px 16px 10px", fontWeight: 700, fontSize: 18,
          background: "var(--sxu-card)", borderBottom: "1px solid var(--sxu-line)",
        }}
      >
        消息
      </div>
      <div className="sxu-card sxu-lazy" style={{ padding: "2px 14px", margin: "0 8px" }}>
        {rows.map((r) => (
          <div
            key={r.key}
            style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--sxu-line)", cursor: "pointer" }}
            onClick={() => navigate(r.to)}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <span
                style={{
                  width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, background: "var(--sxu-primary-weak)", color: "var(--sxu-primary)",
                }}
              >
                {r.icon}
              </span>
              {r.count > 0 && (
                <span
                  style={{
                    position: "absolute", top: -3, right: -5, minWidth: 17, height: 17, padding: "0 5px",
                    borderRadius: 9, background: "#e0533f", color: "#fff", fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
                  }}
                >
                  {r.count > 99 ? "99+" : r.count}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sxu-row">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</span>
                <span className="sxu-sub" style={{ fontSize: 12, flexShrink: 0 }}>{r.time}</span>
              </div>
              <div className="sxu-sub" style={{ marginTop: 3, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.preview}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
