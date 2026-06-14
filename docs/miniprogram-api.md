# 小程序后端 API 对接说明

更新日期：2026-06-14

## 基本规则

- 小程序不得直接读写 Supabase。
- 小程序先用微信 `code` 换平台 `Bearer token`。
- 后续请求统一携带 `Authorization: Bearer <token>`。
- 服务端按 `wechat_identities -> profiles -> family_members` 校验权限。
- 健康数据按 `familyId + memberId` 隔离。
- 小程序写入血压记录时，服务端强制 `source=miniprogram`。

## 登录会话

`POST /api/miniprogram/session`

请求：

```json
{
  "code": "wx.login 返回的 code"
}
```

返回：

```json
{
  "token": "...",
  "tokenType": "Bearer",
  "expiresIn": 604800
}
```

如果微信身份尚未绑定平台账号，返回 `403 wechat_identity_not_bound`。

## 家庭和成员

`GET /api/miniprogram/families`

返回当前用户可访问的家庭和家庭成员列表。

## 血压记录

`GET /api/miniprogram/families/{familyId}/members/{memberId}/blood-pressure`

可选参数：

- `month=YYYY-MM`
- `limit=100`

`POST /api/miniprogram/families/{familyId}/members/{memberId}/blood-pressure`

请求：

```json
{
  "measuredAt": "2026-06-14T08:00:00.000Z",
  "period": "morning",
  "systolic": 118,
  "diastolic": 80,
  "pulse": 68,
  "note": "备注"
}
```

同一天同一时段已有记录时，返回 `409 duplicate_period_record`，小程序应引导用户修改原记录或确认后处理。

`GET/PATCH/DELETE /api/miniprogram/families/{familyId}/members/{memberId}/blood-pressure/{recordId}`

## 月历报告导出

`GET /api/miniprogram/families/{familyId}/members/{memberId}/blood-pressure/export?format=calendar&month=2026-06`

返回 `.xlsx` 文件流，可用于微信内下载、打开、转发。

也支持：

- `format=xlsx`
- `format=csv`

## 提醒事项

`GET/POST /api/miniprogram/families/{familyId}/members/{memberId}/reminders`

`GET/PATCH/DELETE /api/miniprogram/families/{familyId}/members/{memberId}/reminders/{reminderId}`

提醒时间字段 `dueAt` 使用 `YYYY-MM-DD HH:mm`。

## 数据导出与删除申请

`GET /api/miniprogram/data-export`

导出当前账号可访问范围内的 JSON 数据。

`GET /api/miniprogram/data-requests`

查询当前账号提交过的数据请求。

`POST /api/miniprogram/data-requests`

请求：

```json
{
  "requestType": "export_all",
  "familyId": "可选 family id",
  "note": "可选说明"
}
```

`requestType` 可选：

- `export_all`
- `delete_all`

## 操作日志

以下操作会写入 `operation_logs`：

- 小程序新增、修改、删除血压记录
- 小程序导出血压报告
- 小程序创建、修改、删除提醒
- 小程序全部数据导出
- 小程序提交数据导出/删除申请
- Web 端解绑微信身份
