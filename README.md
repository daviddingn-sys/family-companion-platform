# family-companion-platform

家庭陪伴平台独立主工程。`bp-monitor` 保持独立可运行，本项目不在旧血压记录项目上继续扩展。

## P1 范围

- Supabase Auth 注册/登录/退出
- 用户 Profile 自动创建
- 家庭管理
- 家庭成员管理
- 老人档案管理

暂不包含 AI 陪伴、AI 聊天、AI 健康总结、用药提醒、周报月报、智能硬件和营销页面。

## 技术栈

- Next.js App Router
- Supabase Auth / Database
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
```

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

P1 核心表：

- `profiles`
- `families`
- `family_members`
- `elders`

后续健康数据必须关联：

- `family_id`
- `elder_id`
- `recorded_by`

## 血压模块迁移原则

后续从 `bp-monitor` 迁移：

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
