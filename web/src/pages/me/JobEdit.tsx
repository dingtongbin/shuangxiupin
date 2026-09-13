import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar, Input, TextArea, Button, Toast, Radio, Picker } from "antd-mobile";
import { jobApi, companyApi } from "@/api/job";
import { userApi } from "@/api/user";
import { CityPicker } from "@/components/CityPicker";
import type { Dicts } from "@/api/types";

/** 发布/编辑职位：公司选择或新建、薪资格式 nK-nK、三段式地区 */
export default function JobEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editId = id ? Number(id) : 0;

  const { data: dicts } = useQuery({ queryKey: ["dicts"], queryFn: userApi.dicts, staleTime: Infinity });
  const { data: editing } = useQuery({
    queryKey: ["job", editId],
    queryFn: () => jobApi.detail(editId),
    enabled: editId > 0,
  });

  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [companyId, setCompanyId] = useState<number>(0);
  const [companyName, setCompanyName] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [funding, setFunding] = useState("");
  const [restType, setRestType] = useState(1);
  const [title, setTitle] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [education, setEducation] = useState<number[]>([1]);
  const [experience, setExperience] = useState<number[]>([1]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [workCycle, setWorkCycle] = useState("");
  const [workDaysWeek, setWorkDaysWeek] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [recruitStart, setRecruitStart] = useState("");
  const [recruitEnd, setRecruitEnd] = useState("");
  const [description, setDescription] = useState("");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setMode("pick");
      setCompanyId(editing.company.id);
      setTitle(editing.title);
      setSalaryMin(String(editing.salary_min));
      setSalaryMax(String(editing.salary_max));
      setEducation([editing.education]);
      setExperience([editing.experience]);
      setCity(editing.city);
      setDistrict(editing.district);
      setStreet(editing.street);
      setContactPhone(editing.contact_phone || "");
      setContactEmail(editing.contact_email || "");
      setWorkCycle(editing.work_cycle || "");
      setWorkDaysWeek(editing.work_days_week > 0 ? String(editing.work_days_week) : "");
      setWorkHours(editing.work_hours || "");
      setRecruitStart(editing.recruit_start || "");
      setRecruitEnd(editing.recruit_end || "");
      setDescription(editing.description);
    }
  }, [editing]);

  const submit = async () => {
    if (mode === "pick" && !companyId) {
      Toast.show("请选择公司");
      return;
    }
    if (mode === "new" && companyName.trim().length < 2) {
      Toast.show("请填写公司名称");
      return;
    }
    const min = Number(salaryMin);
    const max = Number(salaryMax);
    if (!min || !max || min > max) {
      Toast.show("薪资范围不正确（单位 k，如 10 - 15）");
      return;
    }
    if (!title.trim() || !city) {
      Toast.show("请填写职位名称与工作城市");
      return;
    }
    const payload: Record<string, unknown> = {
      title: title.trim(),
      salary_min: min,
      salary_max: max,
      education: education[0] ?? 1,
      experience: experience[0] ?? 1,
      city,
      district: district.trim(),
      street: street.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim(),
      work_cycle: workCycle.trim(),
      work_days_week: Number(workDaysWeek) || 0,
      work_hours: workHours.trim(),
      recruit_start: recruitStart,
      recruit_end: recruitEnd,
      description: description.trim(),
    };
    if (mode === "pick") {
      payload.company_id = companyId;
    } else {
      payload.company = {
        name: companyName.trim(),
        industry,
        size,
        funding,
        rest_type: restType,
        credit_code: creditCode.trim().toUpperCase(),
      };
    }
    setLoading(true);
    const res = await (editId > 0 ? jobApi.update(editId, payload) : jobApi.create(payload)).catch(() => null);
    setLoading(false);
    if (res) {
      Toast.show({ content: editId > 0 ? "已保存" : "发布成功", position: "bottom" });
      navigate("/me/enterprise", { replace: true });
    }
  };

  const eduCols = [(dicts?.educations ?? []).map((o) => ({ value: o.value, label: o.label }))];
  const expCols = [(dicts?.experiences ?? []).map((o) => ({ value: o.value, label: o.label }))];

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>{editId > 0 ? "编辑职位" : "发布职位"}</NavBar>

      <div className="sxu-card">
        {editId === 0 && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Button size="small" color={mode === "pick" ? "primary" : "default"} onClick={() => setMode("pick")}>
                选择已有公司
              </Button>
              <Button size="small" color={mode === "new" ? "primary" : "default"} onClick={() => setMode("new")}>
                新建公司主体
              </Button>
            </div>
            {mode === "pick" ? (
              <CompanyPicker
                value={companyId}
                onChange={setCompanyId}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Input value={companyName} onChange={setCompanyName} placeholder="公司名称（全局唯一）" clearable />
                <Input
                  value={creditCode}
                  onChange={(v) => setCreditCode(v.toUpperCase())}
                  placeholder="统一社会信用代码（选填，用于关联企业）"
                  maxLength={18}
                  clearable
                />
                <Picker
                  columns={[industryCols(dicts)]}
                  value={industry ? [industry] : []}
                  onConfirm={(v) => setIndustry((v[0] as string) ?? "")}
                >
                  {(items, actions) => (
                    <div onClick={() => actions.toggle()} className="picker-like">{items[0]?.label ?? "选择行业（选填）"}</div>
                  )}
                </Picker>
                <Picker
                  columns={[sizeCols(dicts)]}
                  value={size ? [size] : []}
                  onConfirm={(v) => setSize((v[0] as string) ?? "")}
                >
                  {(items, actions) => (
                    <div onClick={() => actions.toggle()} className="picker-like">{items[0]?.label ?? "公司规模（选填）"}</div>
                  )}
                </Picker>
                <Picker
                  columns={[fundingCols(dicts)]}
                  value={funding ? [funding] : []}
                  onConfirm={(v) => setFunding((v[0] as string) ?? "")}
                >
                  {(items, actions) => (
                    <div onClick={() => actions.toggle()} className="picker-like">{items[0]?.label ?? "融资阶段（选填）"}</div>
                  )}
                </Picker>
                <div className="sxu-row">
                  <span style={{ fontSize: 14 }}>休息制度</span>
                  <Radio.Group value={restType} onChange={(v) => setRestType(Number(v))}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <Radio value={1} style={{ "--font-size": "14px" }}>双休</Radio>
                      <Radio value={2} style={{ "--font-size": "14px" }}>单休</Radio>
                      <Radio value={3} style={{ "--font-size": "14px" }}>不定</Radio>
                    </div>
                  </Radio.Group>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ height: editId === 0 ? 16 : 0 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input value={title} onChange={setTitle} placeholder="职位名称（如：Go 开发工程师）" maxLength={64} clearable />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Input
              value={salaryMin}
              onChange={(v) => setSalaryMin(v.replace(/\D/g, ""))}
              placeholder="最低 k"
              inputMode="numeric"
              maxLength={3}
              style={{ flex: 1 }}
            />
            <span className="sxu-sub">k 至</span>
            <Input
              value={salaryMax}
              onChange={(v) => setSalaryMax(v.replace(/\D/g, ""))}
              placeholder="最高 k"
              inputMode="numeric"
              maxLength={3}
              style={{ flex: 1 }}
            />
            <span className="sxu-sub">k</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Picker columns={eduCols} value={education} onConfirm={(v) => setEducation(v.map(Number))}>
              {(items) => (
                <div className="picker-like">{items[0]?.label ?? "学历要求"}</div>
              )}
            </Picker>
            <Picker columns={expCols} value={experience} onConfirm={(v) => setExperience(v.map(Number))}>
              {(items) => (
                <div className="picker-like">{items[0]?.label ?? "经验要求"}</div>
              )}
            </Picker>
          </div>
          <div className="picker-like" onClick={() => setCityPickerVisible(true)}>
            {city || "工作城市（点击选择，支持搜索）"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Input value={district} onChange={setDistrict} placeholder="区县（如 武侯区）" style={{ flex: 1 }} clearable />
            <Input value={street} onChange={setStreet} placeholder="街道（如 武侯大道）" style={{ flex: 1 }} clearable />
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>任职工况（选填，展示在职位详情）</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Input value={workCycle} onChange={setWorkCycle} placeholder="工作周期（如 长期）" maxLength={32} style={{ flex: 1 }} clearable />
            <Input
              value={workDaysWeek}
              onChange={(v) => setWorkDaysWeek(v.replace(/\D/g, ""))}
              placeholder="每周几天"
              inputMode="numeric"
              maxLength={1}
              style={{ flex: 1 }}
              clearable
            />
          </div>
          <Input value={workHours} onChange={setWorkHours} placeholder="每天工作时间（如 9:00-18:00）" maxLength={64} clearable />
          <div style={{ display: "flex", gap: 10 }}>
            <Input type="date" value={recruitStart} onChange={setRecruitStart} style={{ flex: 1 }} className="picker-like" />
            <Input type="date" value={recruitEnd} onChange={setRecruitEnd} style={{ flex: 1 }} className="picker-like" />
          </div>
          <Input
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="联系电话（选填，求职者可见）"
            inputMode="tel"
            maxLength={32}
            clearable
          />
          <Input
            value={contactEmail}
            onChange={setContactEmail}
            placeholder="联系邮箱（选填，求职者可见）"
            inputMode="email"
            maxLength={64}
            clearable
          />
          <TextArea
            value={description}
            onChange={setDescription}
            placeholder="职位描述（最多 2000 字）"
            rows={4}
            maxLength={2000}
            showCount
          />
        </div>

        <Button block color="primary" size="large" loading={loading} onClick={submit} style={{ "--border-radius": "24px", marginTop: 16 }}>
          {editId > 0 ? "保存修改" : "发布职位"}
        </Button>
      </div>

      <CityPicker
        visible={cityPickerVisible}
        value={city}
        onClose={() => setCityPickerVisible(false)}
        onSelect={(c) => {
          setCity(c);
          setCityPickerVisible(false);
        }}
      />

      <style>{`
        .picker-like {
          padding: 10px 12px;
          border: 1px solid var(--sxu-line);
          border-radius: 8px;
          font-size: 15px;
          color: var(--sxu-ink);
          background: var(--sxu-card);
        }
        .flex1 { flex: 1 }
      `}</style>
    </div>
  );
}

function industryCols(dicts: Dicts | undefined) {
  return (dicts?.industries ?? []).map((s) => ({ value: s, label: s }));
}
function sizeCols(dicts: Dicts | undefined) {
  return (dicts?.sizes ?? []).map((s) => ({ value: s, label: s }));
}
function fundingCols(dicts: Dicts | undefined) {
  return (dicts?.fundings ?? []).map((s) => ({ value: s, label: s }));
}

/** 已有公司选择：输入公司名搜索后点选 */
function CompanyPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [kw, setKw] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["company-pick", kw],
    queryFn: () => companyApi.list({ kw, page: 1, page_size: 20 }),
  });
  return (
    <div>
      <Input value={kw} onChange={setKw} placeholder="输入公司名搜索并选择" clearable />
      <div style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
        {isFetching && <div className="sxu-sub">搜索中…</div>}
        {(data?.list ?? []).map((c) => (
          <div
            key={c.id}
            onClick={() => onChange(c.id)}
            style={{
              padding: "10px 8px",
              borderBottom: "1px solid var(--sxu-line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: value === c.id ? "var(--sxu-primary)" : undefined,
              fontWeight: value === c.id ? 600 : 400,
            }}
          >
            <span>{c.name}</span>
            <span className="sxu-sub">{c.rest_label} · {c.size}</span>
          </div>
        ))}
        {data && data.list.length === 0 && kw && (
          <div className="sxu-sub" style={{ padding: 8 }}>
            没找到？切到「新建公司主体」直接创建（创建即同时创建点评主体）。
          </div>
        )}
      </div>
    </div>
  );
}
