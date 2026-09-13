import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { sysApi, type RoleView } from "@/api/sys";
import { padId } from "@/pages/Users";

interface EditorState {
  role: RoleView | "new";
  permIds: Set<number>;
  name: string;
  code: string;
  remark: string;
}

export default function Roles() {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["sys-roles"], queryFn: sysApi.roles });
  const permissions = useQuery({ queryKey: ["sys-permissions"], queryFn: sysApi.permissions });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form] = Form.useForm();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sys-roles"] });

  const openNew = () => {
    form.resetFields();
    setEditor({ role: "new", permIds: new Set(), name: "", code: "", remark: "" });
  };

  const openEdit = (r: RoleView) => {
    form.setFieldsValue({ name: r.name, remark: r.remark });
    const ids = new Set<number>();
    (permissions.data ?? []).forEach((p) => {
      if (r.permissions.includes(p.code)) ids.add(p.id);
    });
    setEditor({ role: r, permIds: ids, name: r.name, code: r.code, remark: r.remark });
  };

  const save = async () => {
    if (!editor) return;
    if (editor.role === "new") {
      const values = await form.validateFields();
      const ok = await sysApi.createRole({
        code: values.code,
        name: values.name,
        remark: values.remark,
        permissions: [...editor.permIds],
      });
      if (ok !== null) message.success("角色已创建");
    } else {
      const values = editor.role.builtin ? { name: editor.role.name, remark: editor.role.remark } : await form.validateFields();
      const ok = await sysApi.updateRole(editor.role.id, {
        name: values.name,
        remark: values.remark,
        permissions: [...editor.permIds],
      });
      if (ok !== null) message.success("权限已更新，相关用户即时生效");
    }
    setEditor(null);
    refresh();
  };

  const remove = (r: RoleView) => {
    Modal.confirm({
      title: `删除角色「${r.name}」？`,
      okType: "danger",
      onOk: async () => {
        const ok = await sysApi.deleteRole(r.id);
        if (ok !== null) {
          message.success("已删除");
          refresh();
        }
      },
    });
  };

  const groups = [...new Set((permissions.data ?? []).map((p) => p.group))];

  const editingRole = editor && editor.role !== "new" ? editor.role : null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
          新建自定义角色
        </Button>
      </Space>

      <Table<RoleView>
        rowKey="id"
        scroll={{ x: "max-content" }}
        loading={roles.isPending}
        dataSource={roles.data ?? []}
        pagination={false}
        columns={[
          {
            title: "角色",
            render: (_, r) => (
              <Space>
                <b>{r.name}</b>
                <Tag color={r.builtin ? "blue" : "default"}>{r.builtin ? "内置" : "自定义"}</Tag>
                <span style={{ color: "#999", fontSize: 12, fontFamily: "monospace" }}>{padId(r.id)}</span>
              </Space>
            ),
          },
          { title: "备注", dataIndex: "remark" },
          {
            title: "权限点",
            dataIndex: "permissions",
            render: (codes: string[]) =>
              codes.length === 0 ? <Tag>无权限</Tag> : codes.map((c) => <Tag key={c}>{c}</Tag>),
          },
          { title: "持有人数", dataIndex: "user_count", width: 100 },
          {
            title: "操作",
            width: 180,
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>
                  {r.builtin ? "调整权限" : "编辑"}
                </Button>
                {!r.builtin && (
                  <Popconfirm title="确定删除该角色？" okButtonProps={{ danger: true }} onConfirm={() => remove(r)}>
                    <Button size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editor?.role === "new" ? "新建自定义角色" : `编辑角色：${editingRole?.name ?? ""}`}
        open={editor !== null}
        onOk={save}
        onCancel={() => setEditor(null)}
        width={560}
        okText="保存"
        destroyOnHidden
      >
        {editor?.role === "new" && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="code"
              label="角色编码（唯一，创建后不可改）"
              rules={[{ required: true, pattern: /^[a-z][a-z0-9_]{1,31}$/, message: "小写字母开头，2-32 位小写字母/数字/下划线" }]}
            >
              <Input placeholder="如 reviewer" />
            </Form.Item>
            <Form.Item name="name" label="角色名称" rules={[{ required: true, min: 2, max: 20 }]}>
              <Input placeholder="2-20 个字" />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input maxLength={100} />
            </Form.Item>
          </Form>
        )}
        {editingRole && !editingRole.builtin && (
          <Form form={form} layout="vertical" style={{ marginBottom: 8 }}>
            <Form.Item name="name" label="角色名称" rules={[{ required: true, min: 2, max: 20 }]}>
              <Input maxLength={20} />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input maxLength={100} />
            </Form.Item>
          </Form>
        )}
        <div style={{ fontWeight: 600, margin: "8px 0" }}>权限点</div>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 12 }}>
            <div style={{ color: "#999", fontSize: 12, marginBottom: 4 }}>{g}</div>
            <Space direction="vertical">
              {(permissions.data ?? [])
                .filter((p) => p.group === g)
                .map((p) => (
                  <Checkbox
                    key={p.code}
                    checked={editor?.permIds.has(p.id)}
                    onChange={(e) => {
                      if (!editor) return;
                      const next = new Set(editor.permIds);
                      if (e.target.checked) next.add(p.id);
                      else next.delete(p.id);
                      setEditor({ ...editor, permIds: next });
                    }}
                  >
                    {p.name} <span style={{ color: "#bbb", fontSize: 12 }}>{p.code}</span>
                  </Checkbox>
                ))}
            </Space>
          </div>
        ))}
      </Modal>
    </div>
  );
}
