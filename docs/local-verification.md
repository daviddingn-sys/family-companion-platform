# 本地浏览器验证

## 1. 准备环境变量

没有 `.env.local` 时，可以先验证登录页配置提示：

```bash
pnpm verify:auth-config
```

提交或部署前可以跑完整构建验证：

```bash
pnpm verify:build
```

如果只想验证当前生产构建和 `/api/health`：

```bash
pnpm build
pnpm verify:production-health
```

复制示例文件：

```bash
cp .env.local.example .env.local
```

填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
COZE_WORKLOAD_IDENTITY_API_KEY=
```

Supabase 中的对应位置：

- URL：项目 `Settings` -> `Data API` 或 API 页面中的 Project URL。
- Anon key：`Settings` -> `API Keys` -> Publishable key。
- Service role key：`Settings` -> `API Keys` -> Secret key。
- Database URL：项目顶部 `Connect` -> `Connection string`，选择 pooler 连接串并填入数据库密码。

`COZE_WORKLOAD_IDENTITY_API_KEY` 可选。未配置时 OCR 不可用。AI 健康总结属于后续阶段，当前 Web 端不开放入口。

## 2. 初始化数据库

```bash
pnpm install
pnpm db:migrate
```

## 3. 启动本地服务

```bash
pnpm dev
```

如果 3000 端口被占用：

```bash
pnpm dev -- --port 3100
```

## 4. 健康检查

打开：

```text
http://localhost:3100/api/health
```

正常应返回：

```json
{
  "ok": true,
  "status": "ready",
  "currentPhaseGuards": [
    {
      "ok": true,
      "check": "companion_messages_absent"
    },
    {
      "ok": true,
      "check": "health_reports_ai_summary_absent"
    }
  ]
}
```

`currentPhaseGuards` 用于确认当前 Web 阶段没有残留 AI 陪伴表或 AI 健康总结字段。

## 5. 浏览器主流程

按顺序验证：

- 注册账户
- 用手机号和密码登录
- 创建家庭
- 创建家庭成员
- 新增血压记录
- 确认高血压记录会自动生成异常记录
- 新增用药记录
- 新增提醒事项
- 生成健康周报或月报
- 下载健康报告 Markdown
- 邀请协作成员
- 用匹配手机号的账号接受邀请

## 6. 缺配置时的预期行为

如果没有 `.env.local`，`/login` 和 `/register` 会显示 Supabase 配置提示，而不是返回 500。
