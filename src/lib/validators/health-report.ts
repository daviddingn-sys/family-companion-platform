import { z } from "zod";

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateString = z.string().refine(isDateString, "日期格式应为 YYYY-MM-DD");

function daySpanInclusive(start: string, end: string) {
  const startTime = new Date(`${start}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

export const healthReportSchema = z
  .object({
    periodType: z.enum(["weekly", "monthly"]).default("weekly"),
    periodStart: dateString,
    periodEnd: dateString,
  })
  .refine((value) => new Date(value.periodStart) <= new Date(value.periodEnd), {
    message: "开始日期不能晚于结束日期",
    path: ["periodEnd"],
  })
  .refine((value) => value.periodType !== "weekly" || daySpanInclusive(value.periodStart, value.periodEnd) <= 7, {
    message: "周报周期不能超过 7 天",
    path: ["periodEnd"],
  })
  .refine((value) => value.periodType !== "monthly" || daySpanInclusive(value.periodStart, value.periodEnd) <= 31, {
    message: "月报周期不能超过 31 天",
    path: ["periodEnd"],
  });
