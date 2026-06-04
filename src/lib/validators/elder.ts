import { z } from "zod";

function isOptionalDateString(value: string | undefined) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const elderSchema = z.object({
  name: z.string().trim().min(1, "请输入老人姓名").max(40, "姓名过长"),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  birthDate: z.string().trim().optional().refine(isOptionalDateString, "出生日期格式应为 YYYY-MM-DD"),
  phone: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  medicalNotes: z.string().trim().optional(),
});
