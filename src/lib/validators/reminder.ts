import { z } from "zod";

const optionalReminderTime = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(value)) return false;
    return !Number.isNaN(new Date(value.replace(" ", "T")).getTime());
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
