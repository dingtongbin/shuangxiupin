import { useState } from "react";
import { useNavigate } from "react-router";
import { NavBar, Input, Button, Toast, Radio, Form } from "antd-mobile";
import { companyApi } from "@/api/job";
import { userApi } from "@/api/user";
import { useQuery } from "@tanstack/react-query";

/** 创建点评主体（=公司主体）：按企业名全局唯一，创建后只能由运营管理员维护 */
export default function CompanyCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [funding, setFunding] = useState("");
  const [restType, setRestType] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const { data: dicts } = useQuery({ queryKey: ["dicts"], queryFn: userApi.dicts, staleTime: Infinity });

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Toast.show("请填写企业名称（2-64 字）");
      return;
    }
    setLoading(true);
    const res = await companyApi
      .create({ name: name.trim(), industry, size, funding, rest_type: restType })
      .catch(() => null);
    setLoading(false);
    if (res) {
      Toast.show({
        content: res.created ? "创建成功，欢迎补充评价" : "该企业主体已存在，已为你关联",
        position: "bottom",
      });
      navigate(`/square/company/${res.company.id}`, { replace: true });
    }
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>创建点评主体</NavBar>
      <div className="sxu-card">
        <p className="sxu-sub" style={{ marginTop: 0 }}>
          按企业名称全局唯一：不论谁创建，创建后大家共用；后续资料维护由运营管理员负责。
        </p>
        <Form layout="vertical">
          <Form.Item label="企业名称（必填）">
            <Input placeholder="如：某某科技有限公司" value={name} onChange={setName} maxLength={64} clearable />
          </Form.Item>
          <Form.Item label="休息制度">
            <Radio.Group value={restType} onChange={(v) => setRestType(Number(v))}>
              <div style={{ display: "flex", gap: 16 }}>
                <Radio value={1}>双休</Radio>
                <Radio value={2}>单休</Radio>
                <Radio value={3}>不定</Radio>
              </div>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="行业（选填）">
            <PickerX
              value={industry}
              onChange={setIndustry}
              options={(dicts?.industries ?? []).map((s) => ({ value: s, label: s }))}
              placeholder="选择行业"
            />
          </Form.Item>
          <Form.Item label="公司规模（选填）">
            <PickerX
              value={size}
              onChange={setSize}
              options={(dicts?.sizes ?? []).map((s) => ({ value: s, label: s }))}
              placeholder="选择规模"
            />
          </Form.Item>
          <Form.Item label="融资阶段（选填）">
            <PickerX
              value={funding}
              onChange={setFunding}
              options={(dicts?.fundings ?? []).map((s) => ({ value: s, label: s }))}
              placeholder="选择融资阶段"
            />
          </Form.Item>
        </Form>
        <Button block color="primary" size="large" loading={loading} onClick={submit} style={{ "--border-radius": "24px" }}>
          创建主体
        </Button>
      </div>
    </div>
  );
}

function PickerX({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid var(--sxu-line)",
        background: "var(--sxu-card)",
        fontSize: 15,
        color: value ? "var(--sxu-ink)" : "var(--sxu-sub)",
        appearance: "auto",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
