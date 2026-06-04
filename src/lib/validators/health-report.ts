import { z } from "zod";

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateString = z.string().refine(isDateString, "日期格式应为 YYYY-MM-DD");

export const healthReportSchema = z
  .object({
    periodType: z.enum(["weekly", "monthly"]).default("weekly"),
    periodStart: dateString,
    periodEnd: dateString,
  })
  .refine((value) => new Date(value.periodStart) <= new Date(value.periodEnd), {
    message: "开始日期不能晚于结束日期",
    path: ["periodEnd"],
  });
