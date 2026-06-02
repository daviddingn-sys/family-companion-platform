import { z } from "zod";

export const healthReportSchema = z
  .object({
    periodType: z.enum(["weekly", "monthly"]).default("weekly"),
    periodStart: z.string().min(1, "请选择开始日期"),
    periodEnd: z.string().min(1, "请选择结束日期"),
  })
  .refine((value) => new Date(value.periodStart) <= new Date(value.periodEnd), {
    message: "开始日期不能晚于结束日期",
    path: ["periodEnd"],
  });
