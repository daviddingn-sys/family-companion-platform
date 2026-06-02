import { z } from "zod";

export const reminderSchema = z.object({
  title: z.string().trim().min(1, "请输入提醒标题").max(80, "提醒标题过长"),
  type: z.enum(["medicine", "measurement", "appointment", "custom"]).default("custom"),
  dueAt: z.string().optional(),
  repeatRule: z.string().trim().max(120, "重复规则过长").optional(),
  status: z.enum(["active", "done", "paused", "cancelled"]).default("active"),
  note: z.string().trim().max(500, "备注过长").optional(),
});
