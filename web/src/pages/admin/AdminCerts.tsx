import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Dialog, Toast, Tag, Empty } from "antd-mobile";
import { adminApi } from "@/api/admin";
import type { AdminCertView } from "@/api/admin";

const STATUS = ["", "待审核", "已通过", "已驳回"];

/** 显示用 ID：不足 5 位前缀补 0 */
function padId(id: number): string {
  return String(id).padStart(5, "0");
}

/** 企业认证：申请列表人工审核；也可直接按用户 ID 认证 */
export default function AdminCerts() {
  const [status, setStatus] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [certifyUid, setCertifyUid] = useState("");

  const certs = useQuery({
    queryKey: ["admin-certs", status, refresh],
    queryFn: () => adminApi.certs(status, 1, 50),
  });

  const review = (c: AdminCertView) => {
    Dialog.confirm({
      title: `审核申请 #${c.id}`,
      content: `${c.user?.nickname ?? c.email} 申请认证「${c.company_name}」，是否通过？`,
      confirmText: "通过",
      cancelText: "驳回",
      onCancel: async () => {
        const reason = window.prompt("驳回原因（选填）") || "";
        const ok = await adminApi.reviewCert(c.id, false, reason).catch(() => null);
        if (ok !== null) {
          Toast.show("已驳回");
          setRefresh((r) => r + 1);
        }
      },
      onConfirm: async () => {
        const ok = await adminApi.reviewCert(c.id, true).catch(() => null);
        if (ok !== null) {
          Toast.show("已通过，用户已升级为企业招聘用户");
          setRefresh((r) => r + 1);
        }
      },
    });
  };

  const certify = async () => {
    const uid = Number(certifyUid);
    if (!uid) {
      Toast.show("请输入用户 ID");
      return;
    }
    const companyName = window.prompt("关联公司名称（选填，不存在会自动创建主体）") || "";
    const ok = await adminApi.certify(uid, companyName).catch(() => null);
    if (ok) {
      Toast.show(`已认证用户 ${uid} 为企业招聘用户`);
      setCertifyUid("");
      setRefresh((r) => r + 1);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div className="sxu-card" style={{ marginTop: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>按用户 ID 直接认证（人工）</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={certifyUid} onChange={setCertifyUid} placeholder="用户 ID" inputMode="numeric" style={{ flex: 1 }} />
          <Button color="primary" size="small" onClick={certify}>
            认证
          </Button>
        </div>
        <div className="sxu-sub" style={{ marginTop: 6 }}>
          认证后该用户会立即下线，重新登录后生效；绝不自动升级。
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "12px 4px" }}>
        {[1, 2, 3].map((s) => (
          <a key={s} onClick={() => setStatus(s)} style={{ fontSize: 14, color: status === s ? "var(--sxu-primary)" : "var(--sxu-sub)", fontWeight: status === s ? 600 : 400 }}>
            {STATUS[s]}
          </a>
        ))}
      </div>

      {certs.data?.list.length === 0 && <Empty description="暂无申请" style={{ padding: 40 }} />}
      {(certs.data?.list ?? []).map((c) => (
        <div key={c.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ fontWeight: 600 }}>
              #{c.id} {c.company_name}
            </div>
            <Tag
              color={c.status === 1 ? "warning" : c.status === 2 ? "primary" : "danger"}
              fill="outline"
            >
              {STATUS[c.status]}
            </Tag>
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>
            用户：{c.user?.nickname ?? "-"}（ID {c.user ? padId(c.user.id) : "-"} / {c.email}）
          </div>
          {c.note && <div className="sxu-sub" style={{ marginTop: 2 }}>备注：{c.note}</div>}
          {c.status === 1 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <Button size="small" color="primary" fill="outline" onClick={() => review(c)}>
                审核
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
