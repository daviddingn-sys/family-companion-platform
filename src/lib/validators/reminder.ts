import { z } from "zod";

function isLocalMinuteString(value: string) {
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

const optionalReminderTime = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    return isLocalMinuteString(value);
  }, "计划时间格式应为 YYYY-MM-DD HH:mm")
  .optional();

export const reminderSchema = z.object({
  title: z.string().trim().min(1, "请输入提醒标题").max(80, "提醒标题过长"),
  type: z.enum(["medicine", "measurement", "appointment", "custom"]).default("custom"),
  dueAt: optionalReminderTime,
  repeatRule: z.string().trim().max(120, "重复规则过长").optional(),
  status: z.enum(["active", "done", "paused", "cancelled"]).default("active"),
  note: z.string().trim().max(500, "备注过长").optional(),
});
