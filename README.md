# family-companion-platform

家庭陪伴平台独立主工程。`bp-monitor` 保持独立可运行，本项目不在旧血压记录项目上继续扩展。

## 当前状态

已完成 V0.1 平台基础能力和 P2 基础健康闭环：

- Supabase Auth 注册/登录/退出
- 用户 Profile 自动创建和个人资料管理
- 家庭管理
- 家庭成员管理（邮箱/手机号邀请、接受邀请、角色调整、移除成员）
- 老人档案管理（新增、查看、编辑、删除）
- 血压记录模块（CRUD、月度统计、趋势图、CSV 导出、Excel/CSV 导入、图片上传、OCR 识别）
- 用药记录模块
- 提醒事项模块（基础记录，不含后台推送调度）
- 异常记录模块
- 血压异常自动生成异常记录
- 健康报告模块（规则化周报/月报生成，不含 AI 总结）
- AI 健康总结基础接入（无 AI 密钥时自动回退为规则化总结）
- 吾伴 AI 基础陪伴对话（老人维度消息历史、AI 回复、规则回退）
- 工作台健康数据概览
- `/api/health` 部署健康检查

暂不包含复杂 AI 代理、长期记忆、主动外呼、用药提醒调度、智能硬件和营销页面。

## 技术栈

- Next.js App Router
- Supabase Auth / Database / Storage
- Supabase SSR session proxy
- Drizzle schema / migrations
- Tailwind CSS v4
- shadcn/ui 基础组件

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
COZE_WORKLOAD_IDENTITY_API_KEY=
```

必填：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

可选：

- `COZE_WORKLOAD_IDENTITY_API_KEY`：OCR 识别和 AI 健康总结需要；未配置时 AI 健康总结会回退为规则化总结。

## 开发命令

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
```

## 数据模型

平台核心表：

- `profiles`
- `families`
- `family_members`
- `elders`

健康数据表：

- `blood_pressure_records`
- `medications`
- `reminders`
- `abnormal_events`
- `health_reports`
- `companion_messages`

所有健康数据必须关联：

- `family_id`
- `elder_id`

## 部署

上线前按 [部署说明](docs/deployment.md) 执行。

部署后访问：

```bash
/api/health
```

返回 `ok: true` 表示必要环境变量和 Supabase 数据库连接正常。

## 迁移原则

已从 `bp-monitor` 迁移并平台化：

- 血压记录 CRUD
- 趋势图
- 数据统计
- Excel/CSV 导入导出
- 图片上传
- OCR 识别
- 可复用 UI 组件

不迁移：

- localStorage 手机号登录
- admin 密码逻辑
- `userId=admin`
- 单用户架构
- 当前单页页面结构
