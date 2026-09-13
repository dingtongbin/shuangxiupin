import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, Table, message } from "antd";
import { sysApi, type AnnouncementView } from "@/api/sys";
import { padId } from "@/pages/Users";

/** 系统公告：发布后全员可见（无指定用户）。系统消息则是系统自动触发的用户级通知。 */
export default function Announcements() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["sys-announcements", page],
    queryFn: () => sysApi.announcements(page),
  });

  const submit = async (values: { content: string }) => {
    setLoading(true);
    const ok = await sysApi.createAnnouncement(values.content.trim());
    setLoading(false);
    if (ok !== null) {
      message.success("公告已发布，全员可见");
      form.resetFields();
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["sys-announcements"] });
    }
  };

  return (
    <div>
      <Card title="发布系统公告" style={{ marginBottom: 16 }}>
        <p style={{ color: "#999", fontSize: 12, marginTop: 0 }}>
          公告对所有用户可见（无指定用户），展示在移动端「消息 → 公告」中。
        </p>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="content"
            rules={[{ required: true, min: 1, max: 500, message: "1-500 字" }]}
          >
            <Input.TextArea rows={4} showCount maxLength={500} placeholder="公告内容…" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            发布公告
          </Button>
        </Form>
      </Card>

      <Table<AnnouncementView>
        rowKey="id"
        loading={list.isPending}
        dataSource={list.data?.list ?? []}
        pagination={{
          current: page,
          pageSize: 20,
          total: list.data?.total ?? 0,
          onChange: (p) => setPage(p),
        }}
        columns={[
          { title: "ID", dataIndex: "id", width: 90, render: (v: number) => <span style={{ fontFamily: "monospace" }}>{padId(v)}</span> },
          { title: "公告内容", dataIndex: "content" },
          { title: "发布时间", dataIndex: "created_at", width: 200 },
        ]}
      />
    </div>
  );
}
