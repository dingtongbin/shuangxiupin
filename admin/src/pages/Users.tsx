import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { sysApi, type AdminUserView } from "@/api/sys";

/** 显示用 ID：不足 5 位前缀补 0（1 -> 00001） */
export function padId(id: number): string {
  return String(id).padStart(5, "0");
}

const ROLES = [
  { value: 1, label: "普通用户" },
  { value: 2, label: "企业招聘用户" },
  { value: 3, label: "运营管理员" },
  { value: 4, label: "系统管理员" },
];

export default function Users() {
  const queryClient = useQueryClient();
  const [kw, setKw] = useState("");
  const [role, setRole] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editing, setEditing] = useState<AdminUserView | null>(null);
  const [editForm] = Form.useForm();
  const [roleTarget, setRoleTarget] = useState<AdminUserView | null>(null);
  const [roleIds, setRoleIds] = useState<number[]>([]);

  const users = useQuery({
    queryKey: ["sys-users", kw, role, page],
    queryFn: () => sysApi.users({ kw: kw || undefined, role, page, page_size: 10 }),
  });
  const roles = useQuery({ queryKey: ["sys-roles"], queryFn: sysApi.roles });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sys-users"] });

  const toggleStatus = (u: AdminUserView) => {
    const disable = u.status === 1;
    Modal.confirm({
      title: disable ? `封禁 ${u.nickname}？` : `解除封禁 ${u.nickname}？`,
      content: disable ? "该用户全部会话将立即下线" : undefined,
      onOk: async () => {
        const ok = await sysApi.updateUser(u.id, { status: disable ? 2 : 1 });
        if (ok !== null) {
          message.success(disable ? "已封禁" : "已解封");
          refresh();
        }
      },
    });
  };

  const resetPwd = (u: AdminUserView) => {
    let pwd = "";
    Modal.confirm({
      title: `为 ${u.nickname}（${u.email}）重置密码`,
      content: (
        <Input.Password
          placeholder="新密码（8 位以上，含字母和数字）"
          onChange={(e) => (pwd = e.target.value)}
        />
      ),
      onOk: async () => {
        const ok = await sysApi.updateUser(u.id, { password: pwd });
        if (ok !== null) message.success("已重置，该用户需重新登录");
      },
    });
  };

  const remove = (u: AdminUserView) => {
    Modal.confirm({
      title: `删除用户 ${u.nickname}？`,
      content: "其发表内容将保留并显示“已注销用户”。",
      okType: "danger",
      onOk: async () => {
        const ok = await sysApi.deleteUser(u.id);
        if (ok !== null) {
          message.success("已删除");
          refresh();
        }
      },
    });
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    const ok = await sysApi.createUser(values);
    if (ok !== null) {
      message.success("账号已创建");
      setCreateOpen(false);
      createForm.resetFields();
      refresh();
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    const ok = await sysApi.updateUser(editing.id, { nickname: values.nickname });
    if (ok !== null) {
      message.success("已保存");
      setEditing(null);
      refresh();
    }
  };

  const openRoles = async (u: AdminUserView) => {
    setRoleTarget(u);
    const ids = await sysApi.userRoles(u.id);
    setRoleIds(ids ?? []);
  };

  const saveRoles = async () => {
    if (!roleTarget) return;
    if (roleIds.length === 0) {
      message.warning("至少保留一个角色");
      return;
    }
    const ok = await sysApi.setUserRoles(roleTarget.id, roleIds);
    if (ok !== null) {
      message.success("角色已调整，该用户需重新登录");
      setRoleTarget(null);
      refresh();
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索邮箱 / 昵称"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => {
            setKw(v.trim());
            setPage(1);
          }}
        />
        <Select
          placeholder="角色"
          allowClear
          style={{ width: 160 }}
          options={ROLES}
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建账号
        </Button>
      </Space>

      <Table<AdminUserView>
        rowKey="id"
        scroll={{ x: "max-content" }}
        loading={users.isPending}
        dataSource={users.data?.list ?? []}
        pagination={{
          current: page,
          pageSize: 10,
          total: users.data?.total ?? 0,
          onChange: (p) => setPage(p),
          showTotal: (t) => `共 ${t} 个账号`,
        }}
        columns={[
          { title: "ID", dataIndex: "id", width: 90, render: (v: number) => <span style={{ fontFamily: "monospace" }}>{padId(v)}</span> },
          { title: "邮箱", dataIndex: "email" },
          { title: "昵称", dataIndex: "nickname" },
          {
            title: "角色",
            dataIndex: "role_label",
            width: 130,
            render: (v: string) => <Tag>{v}</Tag>,
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (v: number) =>
              v === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">已封禁</Tag>,
          },
          { title: "注册时间", dataIndex: "created_at", width: 160 },
          {
            title: "操作",
            width: 300,
            render: (_, u) => (
              <Space>
                <Button size="small" onClick={() => openRoles(u)}>
                  调整角色
                </Button>
                <Button size="small" onClick={() => resetPwd(u)}>
                  重置密码
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(u);
                    editForm.setFieldsValue({ nickname: u.nickname });
                  }}
                >
                  编辑
                </Button>
                <Button size="small" danger={u.status === 1} onClick={() => toggleStatus(u)}>
                  {u.status === 1 ? "封禁" : "解封"}
                </Button>
                <Popconfirm title="确定删除该用户？" okButtonProps={{ danger: true }} onConfirm={() => remove(u)}>
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* 新建账号 */}
      <Modal
        title="新建账号"
        open={createOpen}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="user@163.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[{ required: true, min: 8, message: "至少 8 位" }]}
          >
            <Input.Password placeholder="8 位以上，包含字母和数字" />
          </Form.Item>
          <Form.Item name="nickname" label="昵称（选填）">
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={ROLES} placeholder="选择角色" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑昵称 */}
      <Modal
        title={`编辑：${editing?.email ?? ""}`}
        open={!!editing}
        onOk={submitEdit}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, min: 2 }]}>
            <Input maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 调整角色（RBAC 多选） */}
      <Modal
        title={`调整角色：${roleTarget?.nickname ?? ""}`}
        open={!!roleTarget}
        onOk={saveRoles}
        onCancel={() => setRoleTarget(null)}
      >
        <Select
          mode="multiple"
          style={{ width: "100%" }}
          placeholder="至少选择一个角色"
          value={roleIds}
          onChange={setRoleIds}
          options={(roles.data ?? []).map((r) => ({
            value: r.id,
            label: `${r.name}（${r.builtin ? "内置" : "自定义"} · ${(r.permissions ?? []).length} 项权限）`,
          }))}
        />
        <p style={{ color: "#999", fontSize: 12, marginTop: 8 }}>
          多角色时主角色取最高内置角色；保存后该用户需重新登录。
        </p>
      </Modal>
    </div>
  );
}
