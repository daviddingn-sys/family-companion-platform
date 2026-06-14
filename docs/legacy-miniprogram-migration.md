# 小程序独立运营后合并到平台的迁移设计

更新日期：2026-06-14

## 目标

小程序先独立上线和运营，积累真实用户和健康记录。平台不强制小程序早期接入统一账号。

当小程序需要升级为家庭陪伴平台数据入口时，通过迁移流程把旧数据归档到平台的家庭、家庭成员和健康档案结构中。

## 原则

- 小程序早期以微信 `openid` 隔离用户。
- 平台侧以后以 `family_id + elder_id` 隔离健康数据。
- 迁移必须由用户确认，不自动把旧数据并入平台账号。
- 迁移必须可追溯，不能丢失旧来源、旧用户标识和旧记录 ID。
- 迁移失败的记录必须可查看、可重试、可人工处理。

## 平台预留字段

健康数据表已预留：

- `legacy_source`
- `legacy_user_key`
- `legacy_record_id`
- `migration_batch_id`

当前覆盖：

- `blood_pressure_records`
- `medications`
- `reminders`
- `abnormal_events`
- `health_reports`

## 迁移表

`data_migration_batches`

用于记录一次迁移任务：

- `family_id`
- `initiated_by`
- `legacy_source`
- `legacy_user_key`
- `status`
- `summary`
- `started_at`
- `completed_at`

`data_migration_logs`

用于记录每条旧数据的处理结果：

- `batch_id`
- `legacy_source`
- `legacy_record_type`
- `legacy_record_id`
- `target_resource_type`
- `target_resource_id`
- `status`
- `message`

## 推荐迁移流程

1. 用户打开新版小程序。
2. 小程序提示升级为家庭陪伴平台。
3. 用户登录或注册平台账号。
4. 服务端根据 `openid` 查询旧小程序数据。
5. 用户选择已有家庭或创建新家庭。
6. 用户选择迁移到已有家庭成员或新建家庭成员。
7. 服务端创建迁移批次。
8. 服务端逐条写入平台健康数据，并写迁移明细。
9. 迁移完成后，展示成功、失败和跳过数量。
10. 后续小程序继续作为平台数据入口。

## 状态建议

迁移批次状态：

- `pending`
- `running`
- `completed`
- `partial_failed`
- `failed`
- `cancelled`

迁移明细状态：

- `pending`
- `migrated`
- `skipped`
- `failed`

## 注意事项

- 同一天同一时段血压重复记录不能静默覆盖。
- 旧数据时间要统一转换为平台时区规则。
- 已迁移记录应通过 `legacy_source + legacy_record_id` 防重复。
- 迁移前应允许用户导出旧数据。
- 迁移后仍应保留迁移日志，便于追溯和客服处理。
