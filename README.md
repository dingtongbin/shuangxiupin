# 双休聘 ShuangXiuPin

> 一个聚焦「双休 / 单休 / 不定」的招聘 + 企业点评社区，移动端 H5（WebView 壳上架）。

![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)

## 许可证

本项目采用 **GNU Affero General Public License v3.0（AGPL-3.0）** 授权（全仓库统一，见 [LICENSE](LICENSE)）。
任何修改后的版本如通过网络提供服务，同样必须以 AGPL-3.0 开源。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + 全量 TypeScript + Vite + **antd-mobile 5** + react-router v7 + TanStack Query v5 + zustand（纯 H5，WebView 方案，**无 RN/Flutter**） |
| 后端 | **Go 1.27 + Gin**（分层：handler → service → gorm，golang-standards/project-layout 精简版） |
| 数据库 | **MySQL 8**（utf8mb4，AutoMigrate 建表 + 内置种子数据） |
| 缓存 | **Redis 7**：会话 Session、邮箱验证码（60s 限频/10min 有效/5 次错误作废）、WebSocket 在线状态 |
| 实时 | **WebSocket**（gorilla/websocket + 自研 Hub）：心跳维持在线、未读消息实时推送 |
| 会话 | Cookie(SID) + Redis，滑动续期 7 天，**不落 MySQL** |
| 邮件 | net/smtp（465 SSL / 587 STARTTLS 自适应）：验证码、企业认证申请通知我方运营邮箱 |

## 目录结构

```
├── LICENSE                  # AGPL-3.0 全文
├── .github/workflows/       # CI（全量构建校验）+ 主前端 GitHub Pages 托管发布
├── docs/                    # 项目分析、接口说明、用户协议、隐私政策
├── admin/                   # 系统管理 PC 控制台（React+TS+Ant Design 5，独立应用，内网使用）
├── server/                  # Go 后端
│   ├── cmd/server/main.go
│   ├── configs/             # config.example.yaml / admin.example.yaml（config.yaml、admin.yaml 不入库）
│   └── internal/            # apperr/config/database/handler/middleware/model/router/service/session/verify/ws/…
└── web/                     # React 前端（Vite）
    └── src/                 # api/ components/ pages/ stores/ hooks/ data/ styles/
```

## 快速开始

### 0. 依赖
Go 1.27+ / Node 20+ / MySQL 8 / Redis 7

```sql
CREATE DATABASE shuangxiupin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sxu'@'127.0.0.1' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON shuangxiupin.* TO 'sxu'@'127.0.0.1';
```

### 1. 后端
```bash
cd server
cp configs/config.example.yaml configs/config.yaml   # 修改 DSN/Redis/邮件
go run ./cmd/server -config configs/config.yaml      # 自动建表 + 种子数据
# 首次启动会创建默认系统管理员（见 seed 配置），登录后强制修改密码
```

### 2. 移动端 H5（用户端）
```bash
cd web
npm install
npm run dev        # http://localhost:5173，已代理 /api /uploads 到 :8080
npm run build      # 产物 dist/，生产由后端 StaticDir 托管（SPA fallback）
```

### 3. 系统管理 PC 控制台（独立服务进程，仅内网）
```bash
# 后端（独立入口，默认 :8090）
cd server && make build-admin && make run-admin   # 或 go run ./cmd/admin
# 前端
cd admin && npm install && npm run dev      # 开发 http://localhost:5174（代理到 :8090）
npm run build                               # 产物 dist/，由管理服务进程直接托管
```
- 打开 **http://<内网IP>:8090/**，仅系统管理员可登录；整个服务进程仅内网可访问（`IntranetOnly` 全局中间件 + 不信任代理头）
- 功能：用户管理（增删改查/封禁/重置密码/多角色分配）、角色与权限（RBAC 自定义角色）、邮箱白名单、**系统公告**（全员可见，区别于系统自动触发的用户级"系统消息"）、**系统参数**（保存即时生效，无需重启）：
    - 自助注册开关、验证码有效期/发送间隔/错误次数/每日上限
    - **SMTP 邮件服务器**：默认按阿里云企业邮箱预置（smtp.qiye.aliyun.com，465+SSL），填入邮箱账号与授权码即可发验证码；支持发送测试邮件；密码保存后不回显
    - 运营通知邮箱（接收企业认证申请通知）
- 与主服务共享 MySQL/Redis（会话互通），但**不含任何用户端与运营端接口**；主服务 :8080 已无 /sys 路由

### 3. 演示账号（本地冒烟测试产生的数据）
| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 系统管理员 | admin@shuangxiupin.cn | `Admin2026abc`（已过强制改密） |
| 运营管理员 | ops@163.com | `Ops2026abc` |
| 普通用户 | alice@163.com | `Alice2026abc` |
| 企业招聘用户 | bob@qq.com | `Bob2026abc` |

> 邮件未配置（`mail.enabled: false`）时验证码只打印到服务端日志，便于本地联调。

## 核心业务规则（与需求逐条对应）

- **角色**：系统管理员（只管用户账号：建/封/删/重置密码/调角色，**接口层就禁止其触碰任何 UGC**）；运营管理员（内容运营：隐藏/恢复/删除帖子、评论、评价、职位，维护公司资料；企业认证人工审核）；企业招聘用户（发职位）；普通用户（社区主体）。
- **注册**：仅允许白名单内国内邮箱域（后台可维护）；6 位邮箱验证码：同邮箱 60s 一次、10 分钟有效、最多输错 5 次、每日 20 条上限。
- **企业认证**：设置内提交入口 → 将认证材料（营业执照等）发送至我方运营邮箱并附用户 ID → 运营人工审核（也支持运营**手动输入用户 ID** 一步认证）；**绝不自动升级**；通过后升级为企业招聘用户、按企业名称绑定点评主体并站内通知；认证用户昵称旁展示「招聘者」标签，运营管理员发言展示「运营」标签。
- **公司主体 = 点评主体（1:1）**：按企业名全局唯一，谁先创建大家共用；主体详情页含 评价 / 工商信息 / 在招职位 三个标签；**统一社会信用代码**由运营维护，招聘者发布职位时按信用代码优先关联主体（同名不同代码不会串）；创建开放（名称不存在即可建），资料维护仅限运营管理员。
- **职位**：企业用户发布；首页/搜索结果共用卡片与筛选（最新排序 + 城市 + 学历[含高中/无要求]/薪资/经验/行业/规模/融资）；城市选择树 A-Z 拼音首字母分组并支持搜索；薪资固定展示 `nK-nK`；详情含发布者卡片（可进其主页）、关联公司、任职工况（工作周期/每周天数/每天时段/招聘起止）、描述（≤2000 字）与投递方式（邮箱/电话）；详情可收藏；浏览记录自动跟踪；已注销用户的职位与过期职位不进入列表/搜索；卡片懒加载（InfiniteScroll）+ 懒渲染（content-visibility）。
- **广场**：关注（关注者的动态）/ 问答（求助帖 + 回答 + 两级评论；回答可点赞/收藏/转发）/ 点评（1-5 分 + 评分点打分 + 文字评价；主体卡片：logo 或占位 + 绿双休/红单休/红黑不定徽标 + 均分 + 点赞最多的评价）；点评列表支持 评分最高/最低、评分人数最多/最少排序；选中标签全局记忆，离开再回精确恢复。
- **互动**：问答/回答/评价均可点赞；回答可收藏与转发（转发即发布一条引用帖并累加计数）；新发表的回答/评论/回复本地置顶即时显示（不刷新页面）；回复默认按点赞排序、可切最新；各列表实时显示赞/评/转计数。
- **消息中心**：仅系统消息 + 广场互动消息（**无私信**，普通用户与企业用户之间亦不可私信）；未读数经 WebSocket 实时推送，底部 Tab 红点。
- **合规**：应用商店上架所需的《用户协议》《隐私政策》已在 `docs/` 拟定，并在 App 内注册页/设置页可查看。

## CI/CD（GitHub Actions）

所有内容提交都必须走 CI（`.github/workflows/ci.yml`），push/PR 到 `main` 自动运行：

| Job | 内容 |
| --- | --- |
| `server` | `go build` + `go vet` + `go test` |
| `web` | `npm ci` + `tsc --noEmit` + `vite build` |
| `admin` | `npm ci` + `tsc --noEmit` + `vite build`（**仅构建校验，不发布**） |

**发布策略**：

- **主前端（web）**：由 `deploy-pages.yml` 自动托管发布到 **GitHub Pages**（`https://<owner>.github.io/<repo>/`）
- **管理端（admin）**：**不走 CI 发布** —— 仅内网使用，产物由管理服务进程（:8090）在本机托管，构建产物不入任何公开托管
- **后端（server）**：**不走 CI 发布** —— 自行部署到自有服务器（数据库/Redis/邮件均为私有资源）

## GitHub Pages 托管（主前端）

1. 仓库 **Settings → Pages → Build and deployment → Source 选 `GitHub Actions`**（首次部署前设置一次）
2. push 到 `main` 即自动构建发布；工作流做三件事：
    - 以子路径构建：`npm run build -- --base=/<仓库名>/`（路由 `basename` 已按 `BASE_URL` 适配，`404.html` 兜底 SPA 刷新）
    - 注入仓库变量 **`API_BASE`**（可选）：在 Settings → Secrets and variables → Actions → Variables 新建 `API_BASE`（如 `https://api.example.com`），前端 API/WebSocket 将指向该自建后端
    - 上传 `web/dist` 并发布
3. 未配置 `API_BASE` 时为纯静态演示，接口请求同域会失败——生产使用请务必指向真实后端
4. 后端需配合允许 Pages 域名跨域（CORS Origins 配置追加 `https://<owner>.github.io`），并保证 Cookie 会话跨站可用（SameSite/HTTPS）

## 提交到 GitHub

```bash
git add -A
git commit -m "feat: ..."      # 一次提交一件事；server/web/admin 均需保持可构建
git push origin main           # 触发 CI 与 Pages 发布
```

- `server/configs/config.yaml`、`server/configs/admin.yaml` 含密码/密钥，**已 gitignore 永不入库**；新环境从 `*.example.yaml` 复制修改
- 提交前本地自检（与 CI 一致）：`cd server && go build ./... && go vet ./...`；`cd web && npm ci && npx tsc --noEmit && npm run build`；`cd admin && npm ci && npx tsc --noEmit && npm run build`

## 文档

- [docs/01-项目分析.md](docs/01-项目分析.md) —— 需求解读、选型理由、架构、数据模型、API 规划
- [docs/02-接口说明.md](docs/02-接口说明.md) —— 全量 REST/WS 接口
- [docs/用户协议.md](docs/用户协议.md) / [docs/隐私政策.md](docs/隐私政策.md) —— 上架合规文案
