import { z } from "zod";

function isDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const optionalDateString = z
  .string()
  .trim()
  .refine((value) => value === "" || isDateString(value), "日期格式应为 YYYY-MM-DD")
  .optional();

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "请输入药品名称").max(80, "药品名称过长"),
  dosage: z.string().trim().max(80, "剂量过长").optional(),
  frequency: z.string().trim().max(120, "频次过长").optional(),
  instructions: z.string().trim().max(300, "用药说明过长").optional(),
  startDate: optionalDateString,
  endDate: optionalDateString,
  status: z.enum(["active", "paused", "stopped"]).default("active"),
  note: z.string().trim().max(500, "备注过长").optional(),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return data.startDate <= data.endDate;
}, {
  message: "结束日期不能早于开始日期",
  path: ["endDate"],
});
