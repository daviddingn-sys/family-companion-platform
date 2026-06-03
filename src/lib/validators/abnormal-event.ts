import { z } from "zod";

export const abnormalEventSchema = z.object({
  title: z.string().trim().min(1, "请输入异常标题").max(100, "异常标题过长"),
  eventType: z.enum(["blood_pressure", "medication", "fall", "symptom", "other"]).default("other"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  occurredAt: z.string().min(1, "请选择发生时间").refine((value) => !Number.isNaN(new Date(value).getTime()), "发生时间格式不正确"),
  status: z.enum(["open", "monitoring", "resolved"]).default("open"),
  description: z.string().trim().max(1000, "说明过长").optional(),
  relatedBloodPressureRecordId: z.string().uuid("血压记录 ID 格式不正确").optional().or(z.literal("")),
});
