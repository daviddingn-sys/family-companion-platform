# 部署说明

## 1. Supabase 项目

在 Supabase 创建新项目，准备以下配置：

- Project URL
- anon public key
- service role key
- Postgres connection string

不要复用 `bp-monitor` 的单用户数据结构。本项目以家庭为核心，所有健康数据关联 `family_id` 和 `elder_id`。

## 2. 环境变量

本地 `.env.local` 和 Vercel Environment Variables 都需要配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
COZE_WORKLOAD_IDENTITY_API_KEY=
```

获取位置：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 `Settings` -> `Data API` 或项目 API 页面中的 Project URL。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 项目 `Settings` -> `API Keys` 里的 Publishable key。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 项目 `Settings` -> `API Keys` 里的 Secret key，只能放服务端环境变量。
- `DATABASE_URL`：Supabase 项目顶部 `Connect` -> `Connection string`，选择 Transaction pooler 或 Session pooler 的 Postgres URL，并填入数据库密码。
- `COZE_WORKLOAD_IDENTITY_API_KEY`：Coze 工作区的 API key。第一阶段可留空。

`COZE_WORKLOAD_IDENTITY_API_KEY` 影响 OCR。未配置时，OCR 不可用，平台其他模块仍可运行。AI 健康总结属于后续阶段，当前 Web 端不开放入口。

## 3. 时间口径

平台当前以北京时间（Asia/Shanghai）作为家庭健康数据的自然日和自然月口径。数据库字段仍保存 UTC 时间；月度血压筛选、报告周期、提醒时间、异常发生时间和服务端导出展示会按平台时间口径转换。

## 4. 数据库迁移

安装依赖后执行：

```bash
pnpm install
pnpm db:migrate
```

当前迁移包含：

- `profiles`
- `families`
- `family_members`
- `elders`
- `blood_pressure_records`
- `medications`
- `reminders`
- `abnormal_events`
- `health_reports`

迁移文件同时包含 RLS 策略。上线后不要在 Supabase 控制台手工关闭 RLS。

## 5. Supabase Auth

在 Supabase Auth 中确认：

- Email 登录已开启
- Site URL 设置为线上域名
- Redirect URLs 包含线上域名和本地开发域名

建议加入：

```text
http://localhost:3000/**
http://localhost:3100/**
https://your-domain.vercel.app/**
```

## 6. Supabase Storage

血压图片上传默认使用 `blood-pressure-images` bucket。服务端会在首次上传时尝试自动创建该 bucket，因此 `SUPABASE_SERVICE_ROLE_KEY` 必须配置正确。

自动创建时使用以下配置：

- bucket 名称：`blood-pressure-images`
- public：关闭
- 文件大小上限：10MB
- 允许类型：JPG、PNG、WebP
- 文件访问：通过服务端签名 URL

如果自动创建失败，可以在 Supabase Storage 手工创建同名 bucket，并保持 public 关闭。

## 7. Vercel 部署

Vercel 项目设置：

- Framework Preset：Next.js
- Install Command：`pnpm install`
- Build Command：`pnpm build`
- Output Directory：留空

环境变量配置完成后再触发部署。

## 8. 健康检查

部署完成后访问：

```bash
https://your-domain.vercel.app/api/health
```

正常返回：

```json
{
  "ok": true,
  "status": "ready",
  "database": {
    "ok": true
  },
  "tables": [
    {
      "table": "profiles",
      "ok": true
    }
  ]
}
```

如果缺少必要环境变量，会返回 `missing_required_env`。

如果数据库不可用或迁移未跑完整，会返回 `database_unavailable`，并在 `database.failedTable` 标出失败的表。

## 9. 上线前验证

执行：

```bash
pnpm verify:build
```

上线后手工验证：

- 注册新用户
- 创建家庭
- 邀请家庭成员并用匹配账号接受邀请
- 创建老人档案
- 新增血压记录
- 新增用药记录
- 新增提醒事项
- 新增异常记录
- 生成健康周报或月报
- 下载健康报告 Markdown
- 打开工作台确认统计数据变化
