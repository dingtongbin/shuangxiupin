import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, InputNumber, Space, Spin, Switch, Table, Tabs, message } from "antd";
import { sysApi, type SettingItem } from "@/api/sys";

/** 分类定义：按参数键前缀归类，每个分类独立保存 */
const CATEGORIES: { key: string; label: string; match: (k: string) => boolean }[] = [
  { key: "register", label: "注册设置", match: (k) => k.startsWith("register.") },
  { key: "verify", label: "验证码设置", match: (k) => k.startsWith("verify.") },
  { key: "mail", label: "邮件服务器（SMTP）", match: (k) => k.startsWith("mail.") },
];

let renderControlRef: (c: SettingItem) => React.ReactNode = () => null;

const columns = [
  {
    title: "参数",
    render: (_: unknown, c: SettingItem) => (
      <div>
        <div style={{ fontWeight: 600 }}>{c.name}</div>
        <div style={{ color: "#999", fontSize: 12 }}>{c.remark}</div>
        <div style={{ color: "#bbb", fontSize: 12 }}>{c.key}</div>
      </div>
    ),
  },
  { title: "值", width: 300, render: (_: unknown, c: SettingItem) => renderControlRef(c) },
];

function renderControl(
  c: SettingItem,
  values: Record<string, string>,
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  const v = values[c.key] ?? "";
  switch (c.type) {
    case "bool":
      return (
        <Switch
          checked={v === "true"}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={(checked) => setValues((prev) => ({ ...prev, [c.key]: String(checked) }))}
        />
      );
    case "int":
      return (
        <InputNumber
          min={1}
          value={Number(v || 0)}
          onChange={(num) => setValues((prev) => ({ ...prev, [c.key]: String(num ?? "") }))}
          style={{ width: 140 }}
        />
      );
    case "secret":
      return (
        <Input.Password
          value={v}
          placeholder={c.value === "******" ? "已设置，留空保持不变" : c.placeholder || "请输入"}
          onChange={(e) => setValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
          style={{ width: 240 }}
        />
      );
    default:
      return (
        <Input
          value={v}
          placeholder={c.placeholder || "请输入"}
          onChange={(e) => setValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
          style={{ width: 260 }}
        />
      );
  }
}

/** 分类面板：该分类的参数表 + 独立保存按钮 */
function CategoryPanel({
  items,
  keys,
  values,
  setValues,
  saving,
  onSave,
  extra,
}: {
  items: SettingItem[];
  keys: string[];
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  onSave: (keys: string[]) => void;
  extra?: React.ReactNode;
}) {
  renderControlRef = (c) => renderControl(c, values, setValues);
  const rows = keys
    .map((k) => items.find((i) => i.key === k))
    .filter((i): i is SettingItem => !!i);

  return (
    <div>
      <Table<SettingItem> rowKey="key" dataSource={rows} pagination={false} columns={columns} />
      {extra}
      <Button type="primary" style={{ marginTop: 16 }} loading={saving} onClick={() => onSave(keys)}>
        保存本分类
      </Button>
    </div>
  );
}

/** 系统参数：标签页分类切换，每类独立保存，保存后全站即时生效 */
export default function Configs() {
  const queryClient = useQueryClient();
  const configs = useQuery({ queryKey: ["sys-configs"], queryFn: sysApi.configs });
  const [values, setValues] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [savingKeys, setSavingKeys] = useState<string[] | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (configs.data && !ready) {
      const init: Record<string, string> = {};
      configs.data.forEach((c) => (init[c.key] = c.value));
      setValues(init);
      setReady(true);
    }
  }, [configs.data, ready]);

  if (configs.isPending) return <Spin />;

  const items = configs.data ?? [];

  const save = async (keys: string[]) => {
    setSavingKeys(keys);
    const picked: Record<string, string> = {};
    keys.forEach((k) => (picked[k] = values[k] ?? ""));
    const ok = await sysApi.updateConfigs(picked);
    setSavingKeys(null);
    if (ok !== null) {
      message.success("已保存，全站即时生效");
      queryClient.invalidateQueries({ queryKey: ["sys-configs"] });
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) {
      message.warning("请填写测试收件邮箱");
      return;
    }
    setTesting(true);
    const ok = await sysApi.mailTest(testTo.trim());
    setTesting(false);
    if (ok !== null) message.success("测试邮件已发送，请查收");
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <p style={{ color: "#999", fontSize: 12, marginTop: 0 }}>
        系统参数按分类保存，保存后全站即时生效（无需重启服务）。SMTP 密码保存后不回显，留空表示保持不变。
      </p>
      {!ready ? (
        <Spin />
      ) : (
        <Tabs
          defaultActiveKey="register"
          items={CATEGORIES.map((cat) => ({
            key: cat.key,
            label: cat.label,
            children: (
              <CategoryPanel
                items={items}
                keys={items.filter((i) => cat.match(i.key)).map((i) => i.key)}
                values={values}
                setValues={setValues}
                saving={savingKeys !== null}
                onSave={save}
                extra={
                  cat.key === "mail" ? (
                    <Card size="small" title="发送测试邮件" style={{ marginTop: 16, maxWidth: 560 }}>
                      <Space.Compact style={{ width: "100%" }}>
                        <Input
                          placeholder="测试收件邮箱"
                          value={testTo}
                          onChange={(e) => setTestTo(e.target.value)}
                          onPressEnter={sendTest}
                        />
                        <Button type="primary" loading={testing} onClick={sendTest}>
                          发送
                        </Button>
                      </Space.Compact>
                      <p style={{ color: "#999", fontSize: 12, marginBottom: 0 }}>
                        按“保存本分类”后的配置真实发送一封测试邮件；失败会显示具体原因。
                      </p>
                    </Card>
                  ) : undefined
                }
              />
            ),
          }))}
        />
      )}
    </div>
  );
}
