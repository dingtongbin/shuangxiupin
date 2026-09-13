import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { NavBar, Input, TextArea, Button, Toast, ImageUploader } from "antd-mobile";
import { userApi } from "@/api/user";
import { useAuth } from "@/stores/auth";

/** 编辑资料：头像上传、昵称、简介、联系邮箱 */
export default function ProfileEdit() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [fileList, setFileList] = useState<{ url: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setBio(user.bio);
      setContactEmail(user.contact_email);
      setAvatar(user.avatar);
      setFileList(user.avatar ? [{ url: user.avatar }] : []);
    }
  }, [user]);

  const upload = async (file: File) => {
    const res = await userApi.upload(file).catch(() => null);
    if (!res) throw new Error("upload failed");
    setAvatar(res.url);
    return { url: res.url };
  };

  const submit = async () => {
    setLoading(true);
    const u = await userApi
      .updateMe({
        nickname: nickname.trim(),
        bio: bio.trim(),
        contact_email: contactEmail.trim(),
        avatar,
      })
      .catch(() => null);
    setLoading(false);
    if (u) {
      setUser(u);
      Toast.show({ content: "资料已保存", position: "bottom" });
      navigate(-1);
    }
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>编辑资料</NavBar>
      <div className="sxu-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <ImageUploader
            value={fileList}
            onChange={(items) => {
              setFileList(items);
              if (items.length === 0) setAvatar("");
            }}
            upload={upload}
            maxCount={1}
            style={{ "--cell-size": "84px", borderRadius: "50%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="昵称">
            <Input value={nickname} onChange={setNickname} maxLength={20} placeholder="2-20 个字" clearable />
          </Field>
          <Field label="简介">
            <TextArea value={bio} onChange={setBio} maxLength={200} rows={3} placeholder="介绍一下自己（200 字内）" showCount />
          </Field>
          <Field label="联系邮箱">
            <Input value={contactEmail} onChange={setContactEmail} type="email" placeholder="他人可见的联系邮箱" clearable />
          </Field>
        </div>

        <Button block color="primary" size="large" loading={loading} onClick={submit} style={{ "--border-radius": "24px", marginTop: 20 }}>
          保存
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--sxu-sub)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
