import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Space, Switch, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { sysApi, type EmailDomainView } from "@/api/sys";

export default function Domains() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const domains = useQuery({ queryKey: ["sys-domains"], queryFn: sysApi.domains });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sys-domains"] });

  const add = async () => {
    if (!domain.trim()) return;
    const ok = await sysApi.addDomain(domain.trim());
    if (ok !== null) {
      message.success("已添加");
      setDomain("");
      refresh();
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="域名，如 163.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onPressEnter={add}
          style={{ width: 260 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={add}>
          添加
        </Button>
      </Space>
      <p style={{ color: "#999", fontSize: 12, marginTop: 0 }}>
        仅白名单内邮箱可注册；关闭后立即生效（验证码 60 秒限频 / 10 分钟有效 / 5 次错误作废）。
      </p>
      <Table<EmailDomainView>
        rowKey="id"
        scroll={{ x: "max-content" }}
        loading={domains.isPending}
        dataSource={domains.data ?? []}
        pagination={false}
        columns={[
          { title: "域名", dataIndex: "domain" },
          { title: "备注", dataIndex: "remark" },
          { title: "添加时间", dataIndex: "created_at", width: 180 },
          {
            title: "启用",
            dataIndex: "enabled",
            width: 120,
            render: (v: boolean, d) => (
              <Switch
                checked={v}
                checkedChildren="启用"
                unCheckedChildren="关闭"
                onChange={async () => {
                  const ok = await sysApi.toggleDomain(d.id);
                  if (ok !== null) refresh();
                }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
