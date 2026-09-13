import { useState } from "react";
import { useNavigate } from "react-router";
import { NavBar, List, Button, Dialog, Popup } from "antd-mobile";
import { RightOutline, CheckOutline } from "antd-mobile-icons";
import { useAuth } from "@/stores/auth";
import { useTheme, THEME_PRESETS, loadThemeMode, setThemeMode, THEME_MODES, type ThemeMode } from "@/stores/theme";

/** 设置页：列表式设置项，底部退出登录；支持更换主题配色与深浅模式 */
export default function Settings() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const themeColor = useTheme((s) => s.color);
  const setColor = useTheme((s) => s.setColor);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(loadThemeMode());
  const [modeOpen, setModeOpen] = useState(false);

  const activeName = THEME_PRESETS.find((p) => p.color === themeColor)?.name ?? "自定义";
  const modeName = THEME_MODES.find((m) => m.key === mode)?.name ?? "跟随系统";

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>设置</NavBar>
      <div className="sxu-card" style={{ padding: 0 }}>
        <List style={{ "--border-inner": "1px solid var(--sxu-line)" }}>
          <List.Item onClick={() => navigate("/me/profile")} arrow={<RightOutline />}>
            编辑资料
          </List.Item>
          <List.Item onClick={() => navigate("/me/password")} arrow={<RightOutline />}>
            账号与安全（修改密码）
          </List.Item>
          <List.Item
            onClick={() => setThemeOpen(true)}
            arrow={<RightOutline />}
            extra={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--sxu-sub)" }}>
                {activeName}
                <i style={{ width: 14, height: 14, borderRadius: "50%", background: themeColor, display: "inline-block" }} />
              </span>
            }
          >
            主题配色
          </List.Item>
          <List.Item onClick={() => setModeOpen(true)} arrow={<RightOutline />} extra={<span style={{ fontSize: 13, color: "var(--sxu-sub)" }}>{modeName}</span>}>
            深浅模式
          </List.Item>
          {user?.role === 1 && (
            <List.Item onClick={() => navigate("/me/cert")} arrow={<RightOutline />}>
              企业认证
            </List.Item>
          )}
          {user?.role === 2 && (
            <List.Item onClick={() => navigate("/me/enterprise")} arrow={<RightOutline />}>
              招聘管理
            </List.Item>
          )}
          <List.Item onClick={() => navigate("/agreement")} arrow={<RightOutline />}>
            用户协议
          </List.Item>
          <List.Item onClick={() => navigate("/privacy")} arrow={<RightOutline />}>
            隐私政策
          </List.Item>
          <List.Item arrow={<RightOutline />} description="v1.0.0 · AGPL-3.0">
            关于双休聘
          </List.Item>
        </List>
      </div>

      <div style={{ padding: "12px 0" }}>
        <Button
          block
          size="large"
          color="danger"
          fill="outline"
          style={{ "--border-radius": "24px" }}
          onClick={() => {
            Dialog.confirm({
              content: "确定退出登录？",
              onConfirm: async () => {
                await useAuth.getState().logout();
                navigate("/login", { replace: true });
              },
            });
          }}
        >
          退出登录
        </Button>
      </div>

      {/* 深浅模式选择 */}
      <Popup
        visible={modeOpen}
        onMaskClick={() => setModeOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20 }}
      >
        <div className="sxu-row" style={{ marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>深浅模式</span>
          <a style={{ fontSize: 13, color: "var(--sxu-sub)" }} onClick={() => setModeOpen(false)}>
            关闭
          </a>
        </div>
        <List style={{ "--border-inner": "1px solid var(--sxu-line)", borderRadius: 8, overflow: "hidden" }}>
          {THEME_MODES.map((m) => (
            <List.Item
              key={m.key}
              onClick={() => {
                setMode(m.key);
                setThemeMode(m.key);
              }}
              arrow={mode === m.key ? <CheckOutline color="var(--sxu-primary)" /> : <span />}
            >
              {m.name}
            </List.Item>
          ))}
        </List>
        <div className="sxu-sub" style={{ marginTop: 10 }}>
          「跟随系统」会随手机系统的深浅色自动切换
        </div>
      </Popup>

      {/* 主题配色选择 */}
      <Popup
        visible={themeOpen}
        onMaskClick={() => setThemeOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20 }}
      >
        <div className="sxu-row" style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>主题配色</span>
          <a style={{ fontSize: 13, color: "var(--sxu-sub)" }} onClick={() => setThemeOpen(false)}>
            关闭
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {THEME_PRESETS.map((p) => {
            const active = p.color === themeColor;
            return (
              <div
                key={p.key}
                onClick={() => setColor(p.color)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    outline: active ? `2px solid ${p.color}` : "none",
                    outlineOffset: 3,
                  }}
                >
                  {active && <CheckOutline color="#fff" fontSize={24} />}
                </div>
                <span style={{ fontSize: 12, color: active ? p.color : "var(--sxu-sub)", fontWeight: active ? 600 : 400 }}>
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </Popup>
    </div>
  );
}
