import { useEffect } from "react";
import type { ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import { DotLoading, ErrorBlock } from "antd-mobile";
import { useAuth } from "@/stores/auth";
import { useTheme, applyThemeColor } from "@/stores/theme";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TabBarLayout } from "@/components/TabBarLayout";
import { ROLE } from "@/api/types";

import Home from "@/pages/home/Home";
import SearchPage from "@/pages/search/SearchPage";
import SearchResult from "@/pages/search/SearchResult";
import CitySelect from "@/pages/search/CitySelect";
import FilterSelect from "@/pages/search/FilterSelect";
import Square from "@/pages/square/Square";
import PostDetail from "@/pages/square/PostDetail";
import PostCreate from "@/pages/square/PostCreate";
import CompanyDetail from "@/pages/square/CompanyDetail";
import CompanyCreate from "@/pages/square/CompanyCreate";
import ReviewCreate from "@/pages/square/ReviewCreate";
import SquareSearch from "@/pages/square/SquareSearch";
import Messages from "@/pages/message/Messages";
import MessageDetail from "@/pages/message/MessageDetail";
import Me from "@/pages/me/Me";
import Settings from "@/pages/me/Settings";
import ProfileEdit from "@/pages/me/ProfileEdit";
import MyPosts from "@/pages/me/MyPosts";
import Favorites from "@/pages/me/Favorites";
import FavJobs from "@/pages/me/FavJobs";
import ViewJobs from "@/pages/me/ViewJobs";
import History from "@/pages/me/History";
import ChangePasswordPage from "@/pages/me/ChangePassword";
import CertApply from "@/pages/me/CertApply";
import EnterpriseHome from "@/pages/me/EnterpriseHome";
import JobEdit from "@/pages/me/JobEdit";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Forgot from "@/pages/auth/Forgot";
import UserProfile from "@/pages/user/UserProfile";
import JobDetail from "@/pages/job/JobDetail";
import AdminLayout from "@/pages/admin/AdminLayout";
import ForceChangePwd from "@/pages/admin/ForceChangePwd";
import Agreement from "@/pages/legal/Agreement";
import Privacy from "@/pages/legal/Privacy";
import NotFound from "@/pages/NotFound";

function WithTab({ active, element }: { active: string; element: ReactNode }) {
  return (
    <div className="sxu-page">
      <div className="sxu-page-body">{element}</div>
      <TabBarLayout active={active} />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loaded } = useAuth();
  const location = useLocation();
  if (!loaded) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120, color: "var(--sxu-sub)" }}>
        <DotLoading color="primary" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: number[]; children: ReactNode }) {
  return (
    <RequireAuth>
      <RoleCheck roles={roles}>{children}</RoleCheck>
    </RequireAuth>
  );
}

function RoleCheck({ roles, children }: { roles: number[]; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!roles.includes(user!.role)) {
    return <ErrorBlock status="default" title="没有权限" description="该页面仅限特定角色访问" />;
  }
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuth((s) => s.fetchMe);
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const themeColor = useTheme((s) => s.color);
  useWebSocket();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // 主题变化时同步 CSS 变量（启动时已在 theme store 中应用一次）
  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);

  // 默认管理员等账号：未修改初始密码时强制进入改密页
  if (user?.must_change_pwd && !location.pathname.startsWith("/admin/force-change")) {
    return (
      <div className="sxu-page">
        <ForceChangePwd />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<WithTab active="home" element={<Home />} />} />
      <Route path="/square" element={<WithTab active="square" element={<Square />} />} />
      <Route
        path="/messages"
        element={
          <RequireAuth>
            <WithTab active="message" element={<Messages />} />
          </RequireAuth>
        }
      />
      <Route
        path="/messages/:type"
        element={<RequireAuth><div className="sxu-page"><MessageDetail /></div></RequireAuth>}
      />
      <Route
        path="/me"
        element={
          <RequireAuth>
            <WithTab active="me" element={<Me />} />
          </RequireAuth>
        }
      />

      <Route path="/jobs/:id" element={<div className="sxu-page"><JobDetail /></div>} />
      <Route path="/search" element={<div className="sxu-page"><SearchPage /></div>} />
      <Route path="/search/result" element={<div className="sxu-page"><SearchResult /></div>} />
      <Route path="/city" element={<div className="sxu-page"><CitySelect /></div>} />
      <Route path="/filter" element={<div className="sxu-page"><FilterSelect /></div>} />
      <Route path="/square/post/:id" element={<div className="sxu-page"><PostDetail /></div>} />
      <Route
        path="/square/publish"
        element={
          <RequireAuth>
            <div className="sxu-page"><PostCreate /></div>
          </RequireAuth>
        }
      />
      <Route path="/square/company/:id" element={<div className="sxu-page"><CompanyDetail /></div>} />
      <Route
        path="/square/company/create"
        element={
          <RequireAuth>
            <div className="sxu-page"><CompanyCreate /></div>
          </RequireAuth>
        }
      />
      <Route
        path="/square/company/:id/review"
        element={
          <RequireAuth>
            <div className="sxu-page"><ReviewCreate /></div>
          </RequireAuth>
        }
      />
      <Route path="/square/search" element={<div className="sxu-page"><SquareSearch /></div>} />

      <Route path="/login" element={<div className="sxu-page"><Login /></div>} />
      <Route path="/register" element={<div className="sxu-page"><Register /></div>} />
      <Route path="/forgot" element={<div className="sxu-page"><Forgot /></div>} />

      <Route path="/users/:id" element={<div className="sxu-page"><UserProfile /></div>} />

      <Route
        path="/me/profile"
        element={<RequireAuth><div className="sxu-page"><ProfileEdit /></div></RequireAuth>}
      />
      <Route
        path="/me/posts"
        element={<RequireAuth><div className="sxu-page"><MyPosts /></div></RequireAuth>}
      />
      <Route
        path="/me/favorites"
        element={<RequireAuth><div className="sxu-page"><Favorites /></div></RequireAuth>}
      />
      <Route
        path="/me/fav-jobs"
        element={<RequireAuth><div className="sxu-page"><FavJobs /></div></RequireAuth>}
      />
      <Route
        path="/me/history"
        element={<RequireAuth><div className="sxu-page"><History /></div></RequireAuth>}
      />
      <Route
        path="/me/view-jobs"
        element={<RequireAuth><div className="sxu-page"><ViewJobs /></div></RequireAuth>}
      />
      <Route
        path="/me/settings"
        element={<RequireAuth><div className="sxu-page"><Settings /></div></RequireAuth>}
      />
      <Route
        path="/me/password"
        element={<RequireAuth><div className="sxu-page"><ChangePasswordPage /></div></RequireAuth>}
      />
      <Route
        path="/me/cert"
        element={<RequireAuth><div className="sxu-page"><CertApply /></div></RequireAuth>}
      />
      <Route
        path="/me/enterprise"
        element={
          <RequireRole roles={[ROLE.ENTERPRISE]}>
            <div className="sxu-page"><EnterpriseHome /></div>
          </RequireRole>
        }
      />
      <Route
        path="/me/enterprise/jobs/new"
        element={
          <RequireRole roles={[ROLE.ENTERPRISE]}>
            <div className="sxu-page"><JobEdit /></div>
          </RequireRole>
        }
      />
      <Route
        path="/me/enterprise/jobs/:id/edit"
        element={
          <RequireRole roles={[ROLE.ENTERPRISE]}>
            <div className="sxu-page"><JobEdit /></div>
          </RequireRole>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireRole roles={[ROLE.OPS]}>
            <AdminLayout />
          </RequireRole>
        }
      />
      <Route
        path="/admin/force-change"
        element={<div className="sxu-page"><ForceChangePwd /></div>}
      />

      <Route path="/agreement" element={<div className="sxu-page"><Agreement /></div>} />
      <Route path="/privacy" element={<div className="sxu-page"><Privacy /></div>} />
      <Route path="*" element={<div className="sxu-page"><NotFound /></div>} />
    </Routes>
  );
}
