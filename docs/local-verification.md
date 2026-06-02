# 本地浏览器验证

## 1. 准备环境变量

没有 `.env.local` 时，可以先验证登录页配置提示：

```bash
pnpm verify:auth-config
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

`COZE_WORKLOAD_IDENTITY_API_KEY` 可选。未配置时 OCR 不可用，AI 健康总结和吾伴 AI 会使用规则回退。

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
  "status": "ready"
}
```

## 5. 浏览器主流程

按顺序验证：

- 注册账户
- 登录
- 创建家庭
- 创建老人档案
- 新增血压记录
- 确认高血压记录会自动生成异常记录
- 新增用药记录
- 新增提醒事项
- 生成健康周报或月报
- 为报告生成 AI 健康总结
- 打开吾伴 AI，发送一条陪伴消息
- 邀请家庭成员
- 用匹配邮箱或手机号的账号接受邀请

## 6. 缺配置时的预期行为

如果没有 `.env.local`，`/login` 和 `/register` 会显示 Supabase 配置提示，而不是返回 500。
