import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Spin, Result, Button } from "antd";
import { authApi } from "@/api/sys";
import { setUnauthorizedHandler } from "@/api/client";
import BasicLayout from "@/layouts/BasicLayout";
import Login from "@/pages/Login";
import ForceChange from "@/pages/ForceChange";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Domains from "@/pages/Domains";
import Announcements from "@/pages/Announcements";
import Configs from "@/pages/Configs";

export default function App() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me, retry: false });

  useEffect(() => {
    setUnauthorizedHandler(() => navigate("/login", { replace: true }));
  }, [navigate]);

  const loading = me.isPending;
  const loggedIn = !!me.data;
  const isSys = me.data?.role === 4;

  return (
    <Routes>
      <Route path="/login" element={loggedIn && isSys ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          loading ? (
            <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
              <Spin size="large" />
            </div>
          ) : !loggedIn ? (
            <Navigate to="/login" replace />
          ) : me.data!.must_change_pwd ? (
            <ForceChange />
          ) : !isSys ? (
            <Result
              status="403"
              title="403"
              subTitle="该控制台仅限系统管理员使用，请使用系统管理员账号登录"
              extra={
                <Button
                  type="primary"
                  onClick={async () => {
                    await authApi.logout().catch(() => {});
                    navigate("/login", { replace: true });
                  }}
                >
                  重新登录
                </Button>
              }
            />
          ) : (
            <BasicLayout me={me.data!} />
          )
        }
      >
        <Route index element={<Users />} />
        <Route path="roles" element={<Roles />} />
        <Route path="domains" element={<Domains />} />
        <Route path="configs" element={<Configs />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
