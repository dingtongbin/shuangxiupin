import { useNavigate } from "react-router";
import { NavBar, CapsuleTabs } from "antd-mobile";
import { useAuth } from "@/stores/auth";
import AdminCerts from "./AdminCerts";
import AdminContent from "./AdminContent";

/** 运营管理后台（仅运营管理员）：企业认证审核 + 内容运营。
 *  系统管理员使用独立的 /sys 系统管理控制台（仅内网）。 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  return (
    <div>
      <NavBar
        onBack={() => navigate("/me")}
        right={
          <a style={{ color: "var(--sxu-sub)", fontSize: 13 }} onClick={async () => { await useAuth.getState().logout(); navigate("/login", { replace: true }); }}>
            退出
          </a>
        }
      >
        运营管理后台
      </NavBar>

      <CapsuleTabs defaultActiveKey="certs">
        <CapsuleTabs.Tab title="企业认证" key="certs">
          <AdminCerts />
        </CapsuleTabs.Tab>
        <CapsuleTabs.Tab title="内容运营" key="content">
          <AdminContent />
        </CapsuleTabs.Tab>
      </CapsuleTabs>
      <span style={{ display: "none" }}>{user?.id}</span>
    </div>
  );
}
