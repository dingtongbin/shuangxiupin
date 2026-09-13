import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input, Button, Toast, Tag, Empty, Dialog, Picker } from "antd-mobile";
import { adminApi } from "@/api/admin";
import { RestBadge } from "@/components/RestBadge";
import { timeAgo } from "@/components/PostCard";

/** 内容运营：帖子 / 评论 / 评价 / 职位 / 公司（仅运营管理员可见此 Tab） */
export default function AdminContent() {
  return (
    <div>
      <PostModeration />
      <CommentModeration />
      <ReviewModeration />
      <JobModeration />
      <CompanyModeration />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "8px 12px 0" }}>
      <div style={{ fontWeight: 700, fontSize: 15, margin: "8px 4px" }}>{title}</div>
      {children}
    </div>
  );
}

function PostModeration() {
  const [kw, setKw] = useState("");
  const [refresh, setRefresh] = useState(0);
  const posts = useQuery({ queryKey: ["admin-posts", kw, refresh], queryFn: () => adminApi.posts({ kw, page: 1, page_size: 20 }) });

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    const ok = await fn().catch(() => null);
    if (ok !== null) {
      Toast.show(msg);
      setRefresh((r) => r + 1);
    }
  };

  return (
    <Section title="帖子">
      <Input value={kw} onChange={setKw} placeholder="搜索内容关键词" clearable style={{ marginBottom: 8 }} />
      {posts.data?.list.length === 0 && <Empty description="暂无" style={{ padding: 20 }} />}
      {(posts.data?.list ?? []).map((p) => (
        <div key={p.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              #{p.id} {p.content}
            </div>
            <Tag color={p.status === 1 ? "primary" : "danger"} fill="outline">
              {p.status === 1 ? "正常" : "已隐藏"}
            </Tag>
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>
            {p.user.nickname} · {timeAgo(p.created_at)} · 赞{p.like_count} 评{p.comment_count} 转{p.repost_count}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {p.status === 1 ? (
              <Button size="mini" fill="outline" color="warning" onClick={() => act(() => adminApi.hidePost(p.id), "已隐藏")}>
                隐藏
              </Button>
            ) : (
              <Button size="mini" fill="outline" color="primary" onClick={() => act(() => adminApi.restorePost(p.id), "已恢复")}>
                恢复
              </Button>
            )}
            <Button
              size="mini"
              fill="outline"
              color="danger"
              onClick={() => {
                Dialog.confirm({ content: `删除帖子 #${p.id}？`, onConfirm: () => act(() => adminApi.deletePost(p.id), "已删除") });
              }}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function CommentModeration() {
  const [kw, setKw] = useState("");
  const [refresh, setRefresh] = useState(0);
  const comments = useQuery({ queryKey: ["admin-comments", kw, refresh], queryFn: () => adminApi.comments({ kw, page: 1, page_size: 20 }) });

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    const ok = await fn().catch(() => null);
    if (ok !== null) {
      Toast.show(msg);
      setRefresh((r) => r + 1);
    }
  };

  return (
    <Section title="评论">
      <Input value={kw} onChange={setKw} placeholder="搜索评论关键词" clearable style={{ marginBottom: 8 }} />
      {comments.data?.list.length === 0 && <Empty description="暂无" style={{ padding: 20 }} />}
      {(comments.data?.list ?? []).map((c) => (
        <div key={c.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              #{c.id} {c.content}
            </div>
            <Tag color={c.status === 1 ? "primary" : "danger"} fill="outline">
              {c.status === 1 ? "正常" : "已隐藏"}
            </Tag>
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>
            {c.user.nickname} · {timeAgo(c.created_at)} · 帖子#{c.post_id}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {c.status === 1 ? (
              <Button size="mini" fill="outline" color="warning" onClick={() => act(() => adminApi.hideComment(c.id), "已隐藏")}>
                隐藏
              </Button>
            ) : (
              <Button size="mini" fill="outline" color="primary" onClick={() => act(() => adminApi.restoreComment(c.id), "已恢复")}>
                恢复
              </Button>
            )}
            <Button
              size="mini"
              fill="outline"
              color="danger"
              onClick={() => {
                Dialog.confirm({ content: `删除评论 #${c.id}？`, onConfirm: () => act(() => adminApi.deleteComment(c.id), "已删除") });
              }}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function ReviewModeration() {
  const [refresh, setRefresh] = useState(0);
  const reviews = useQuery({ queryKey: ["admin-reviews", refresh], queryFn: () => adminApi.reviews({ page: 1, page_size: 20 }) });

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    const ok = await fn().catch(() => null);
    if (ok !== null) {
      Toast.show(msg);
      setRefresh((r) => r + 1);
    }
  };

  return (
    <Section title="企业评价">
      {reviews.data?.list.length === 0 && <Empty description="暂无" style={{ padding: 20 }} />}
      {(reviews.data?.list ?? []).map((r) => (
        <div key={r.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              #{r.id} {r.company_name} · {r.user.nickname} · {r.overall}分
            </div>
            <Tag color={r.status === 1 ? "primary" : "danger"} fill="outline">
              {r.status === 1 ? "正常" : "已隐藏"}
            </Tag>
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--sxu-ink)" }}>{r.content}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {r.status === 1 ? (
              <Button size="mini" fill="outline" color="warning" onClick={() => act(() => adminApi.hideReview(r.id), "已隐藏")}>
                隐藏
              </Button>
            ) : (
              <Button size="mini" fill="outline" color="primary" onClick={() => act(() => adminApi.restoreReview(r.id), "已恢复")}>
                恢复
              </Button>
            )}
            <Button
              size="mini"
              fill="outline"
              color="danger"
              onClick={() => {
                Dialog.confirm({ content: `删除评价 #${r.id}？评分统计会同步修正`, onConfirm: () => act(() => adminApi.deleteReview(r.id), "已删除") });
              }}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function JobModeration() {
  const [refresh, setRefresh] = useState(0);
  void setRefresh;
  const jobs = useQuery({ queryKey: ["admin-jobs", refresh], queryFn: () => adminApi.jobs({ page: 1, page_size: 20 }) });

  return (
    <Section title="职位">
      {jobs.data?.list.length === 0 && <Empty description="暂无" style={{ padding: 20 }} />}
      {(jobs.data?.list ?? []).map((j) => (
        <div key={j.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ flex: 1 }}>
              #{j.id} {j.title} <span className="sxu-sub">{j.salary_text}</span>
            </div>
            <Tag color={j.status === 1 ? "primary" : "default"} fill="outline">
              {j.status === 1 ? "在招" : "下架"}
            </Tag>
          </div>
          <div className="sxu-sub" style={{ marginTop: 4 }}>
            {j.company.name} · {j.publisher.nickname} · {j.region_text}
          </div>
          <div style={{ marginTop: 8 }}>
            <Button
              size="mini"
              fill="outline"
              color="danger"
              onClick={() => {
                Dialog.confirm({ content: `删除职位 #${j.id}？`, onConfirm: async () => { await adminApi.deleteJob(j.id); Toast.show("已删除"); jobs.refetch(); } });
              }}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function CompanyModeration() {
  const [refresh, setRefresh] = useState(0);
  const companies = useQuery({ queryKey: ["admin-companies", refresh], queryFn: () => adminApi.companies({ page: 1, page_size: 20 }) });

  const changeRest = async (id: number, restType: number) => {
    const ok = await adminApi.updateCompany(id, { rest_type: restType }).catch(() => null);
    if (ok !== null) {
      Toast.show("已更新");
      setRefresh((r) => r + 1);
    }
  };

  return (
    <Section title="公司/点评主体（资料维护）">
      {companies.data?.list.length === 0 && <Empty description="暂无" style={{ padding: 20 }} />}
      {(companies.data?.list ?? []).map((c) => (
        <div key={c.id} className="sxu-card" style={{ marginTop: 0 }}>
          <div className="sxu-row">
            <div style={{ flex: 1 }}>
              #{c.id} {c.name}
              <div className="sxu-sub">
                {c.industry || "行业未填"} · {c.funding || "融资未填"} · {c.size || "规模未填"} · 均分 {c.avg_rating || "-"}
              </div>
            </div>
            <RestBadge type={c.rest_type} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Picker
              columns={[
                [
                  { value: 1, label: "双休" },
                  { value: 2, label: "单休" },
                  { value: 3, label: "不定" },
                ],
              ]}
              value={[c.rest_type]}
              onConfirm={(v) => changeRest(c.id, Number(v[0]))}
            >
              {(items) => <div className="admin-pick">修改休息制度{items[0] ? `：${items[0].label}` : ""}</div>}
            </Picker>
          </div>
        </div>
      ))}
      <style>{`.admin-pick{padding:6px 10px;border:1px solid var(--sxu-line);border-radius:8px;font-size:13px;display:inline-block}`}</style>
    </Section>
  );
}
