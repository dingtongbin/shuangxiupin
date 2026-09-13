import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { NavBar, TextArea, Button, Toast } from "antd-mobile";
import { postApi } from "@/api/job";
import { useAuth } from "@/stores/auth";

/** 提问（发布问答）/ 转发：repost=问答，repost_comment=回答 */
export default function PostCreate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const repostOf = Number(params.get("repost") || 0);
  const repostCommentId = Number(params.get("repost_comment") || 0);
  const user = useAuth((s) => s.user);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) {
      Toast.show("说点什么吧");
      return;
    }
    setLoading(true);
    const res = await postApi.create(content.trim(), repostOf || undefined, repostCommentId || undefined).catch(() => null);
    setLoading(false);
    if (res) {
      const isRepost = !!(repostOf || repostCommentId);
      Toast.show({ content: isRepost ? "转发成功" : "发布成功", position: "bottom" });
      const dest = repostOf
        ? `/square/post/${repostOf}`
        : res?.repost_comment
          ? `/square/post/${res.repost_comment.post_id}`
          : "/square";
      navigate(dest, { replace: true });
    }
  };

  return (
    <div>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Button size="small" color="primary" loading={loading} onClick={submit}>
            发布
          </Button>
        }
      >
        {repostOf ? "转发问答" : repostCommentId ? "转发回答" : "提问"}
      </NavBar>
      <div className="sxu-card">
        <TextArea
          placeholder={repostOf ? "说点你的看法…（转发）" : repostCommentId ? "说点你的看法…（转发回答）" : "描述你的求助问题，如：成都有哪些双休的公司？"}
          value={content}
          onChange={setContent}
          maxLength={2000}
          rows={8}
          showCount
          style={{ "--font-size": "15px" }}
        />
        {repostOf > 0 && (
          <div className="sxu-sub" style={{ marginTop: 8 }}>
            将转发问答 #{repostOf} 到广场，并累加其转发数。
          </div>
        )}
        {repostCommentId > 0 && (
          <div className="sxu-sub" style={{ marginTop: 8 }}>
            将转发回答 #{repostCommentId} 到广场，并累加其转发数。
          </div>
        )}
        {user && (
          <div className="sxu-sub" style={{ marginTop: 8 }}>
            提问人：{user.nickname}
          </div>
        )}
      </div>
    </div>
  );
}
