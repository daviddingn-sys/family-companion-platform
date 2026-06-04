import { z } from "zod";

function isValidDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const date = new Date(year, month - 1, day, hour, minute);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

export const abnormalEventSchema = z.object({
  title: z.string().trim().min(1, "请输入异常标题").max(100, "异常标题过长"),
  eventType: z.enum(["blood_pressure", "medication", "fall", "symptom", "other"]).default("other"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  occurredAt: z.string().min(1, "请选择发生时间").refine(isValidDateTime, "发生时间格式不正确"),
  status: z.enum(["open", "monitoring", "resolved"]).default("open"),
  description: z.string().trim().max(1000, "说明过长").optional(),
  relatedBloodPressureRecordId: z.string().uuid("血压记录 ID 格式不正确").optional().or(z.literal("")),
});
