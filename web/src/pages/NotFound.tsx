import { useNavigate } from "react-router";
import { ErrorBlock, Button } from "antd-mobile";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ paddingTop: 80 }}>
      <ErrorBlock status="default" title="页面不存在" description="它可能已被移动或删除" />
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Button color="primary" shape="rounded" onClick={() => navigate("/", { replace: true })}>
          回首页
        </Button>
      </div>
    </div>
  );
}
