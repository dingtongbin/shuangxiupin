import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Tag, Toast, Empty, Button } from "antd-mobile";
import { certApi } from "@/api/user";
import { useAuth } from "@/stores/auth";

const STATUS = ["", "待审核", "已通过", "未通过"];
const STATUS_COLOR = ["", "default", "primary", "danger"];

const CERT_EMAIL = "shuangxiupin@dingtongbin.cn";

async function copyText(text: string, tip: string) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.show(tip);
  } catch {
    Toast.show("复制失败，请长按手动复制");
  }
}

/** 企业认证：递交认证材料到运营邮箱（附用户 ID），人工审核后升级为招聘者并绑定企业 */
export default function CertApply() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const my = useQuery({
    queryKey: ["my-certs"],
    queryFn: () => certApi.my(1, 20),
    enabled: user?.role === 1,
  });

  if (user?.role === 2) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>企业认证</NavBar>
        <Empty style={{ padding: 64 }} description="你已是企业招聘用户，无需再次认证" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>企业认证</NavBar>

      {/* 用户 ID（邮件里需要附上） */}
      <div className="sxu-card" style={{ textAlign: "center" }}>
        <div className="sxu-sub">你的用户 ID（认证邮件中必须附上）</div>
        <div className="sxu-row" style={{ justifyContent: "center", marginTop: 8, gap: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "var(--sxu-primary)", letterSpacing: 1 }}>
            {user.id}
          </span>
          <a
            onClick={() => copyText(String(user.id), "已复制用户 ID")}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--sxu-sub)" }}
          >
            复制
          </a>
        </div>
      </div>

      {/* 认证流程 */}
      <div className="sxu-card">
        <div style={{ fontWeight: 600, marginBottom: 10 }}>认证方式</div>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>
            请将认证材料发送至运营邮箱，邮件标题注明 <b>「企业认证 + 用户 ID {user.id}」</b>：
          </p>
          <div
            className="sxu-row"
            style={{
              marginTop: 10, background: "var(--sxu-bg)", borderRadius: 8, padding: "10px 12px", gap: 8,
            }}
          >
            <a
              className="sxu-link"
              style={{ fontSize: 15, fontWeight: 600, wordBreak: "break-all" }}
              href={`mailto:${CERT_EMAIL}?subject=${encodeURIComponent(`企业认证 + 用户ID ${user.id}`)}`}
            >
              {CERT_EMAIL}
            </a>
            <a
              onClick={() => copyText(CERT_EMAIL, "已复制邮箱地址")}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--sxu-sub)", flexShrink: 0 }}
            >
              复制
            </a>
          </div>
          <p style={{ margin: "12px 0 0" }} className="sxu-sub">
            需准备的认证材料：
          </p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 2 }} className="sxu-sub">
            <li>营业执照照片（清晰、在有效期内）</li>
            <li>招聘授权书或在职证明（HR / 负责人）</li>
            <li>认证企业名称（与营业执照一致）</li>
          </ul>
          <p style={{ margin: "12px 0 0" }} className="sxu-sub">
            提交后由运营人员 <b style={{ color: "var(--sxu-ink)" }}>人工审核</b>（不会自动通过）。认证通过后你的账号将升级为
            <Tag color="primary" fill="outline" style={{ fontSize: 11, margin: "0 4px" }}>招聘者</Tag>
            并与该企业绑定，可发布职位；结果将通过站内消息通知。
          </p>
        </div>
      </div>

      {/* 我的申请进度 */}
      <div className="sxu-card">
        <div style={{ fontWeight: 600, marginBottom: 10 }}>我的申请</div>
        {my.data?.list.length === 0 && <div className="sxu-sub">暂无申请记录</div>}
        {my.data?.list.map((c) => (
          <div key={c.id} className="sxu-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--sxu-line)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.company_name}</div>
              <div className="sxu-sub">
                {c.status === 3 ? `原因：${c.reject_reason}` : "等待运营人员人工审核"}
              </div>
            </div>
            <Tag color={STATUS_COLOR[c.status] as "default" | "primary" | "danger"} fill="outline">
              {STATUS[c.status]}
            </Tag>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 12px 12px" }}>
        <Button
          block
          color="primary"
          fill="outline"
          style={{ "--border-radius": "24px" }}
          onClick={() => {
            window.open(
              `mailto:${CERT_EMAIL}?subject=${encodeURIComponent(`企业认证 + 用户ID ${user.id}`)}`,
              "_self",
            );
          }}
        >
          打开邮件应用发送材料
        </Button>
      </div>
    </div>
  );
}
