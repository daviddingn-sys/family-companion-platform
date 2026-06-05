import { z } from "zod";

function isOptionalDateString(value: string | undefined) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNotFutureDate(value: string | undefined) {
  if (!value) return true;
  return value <= new Date().toISOString().slice(0, 10);
}

export const elderSchema = z
  .object({
    name: z.string().trim().min(1, "请输入老人姓名").max(40, "姓名过长"),
    gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
    birthDate: z.string().trim().optional().refine(isOptionalDateString, "出生日期格式应为 YYYY-MM-DD"),
    phone: z.string().trim().max(30, "手机号过长").optional(),
    emergencyContactName: z.string().trim().max(40, "紧急联系人姓名过长").optional(),
    emergencyContactPhone: z.string().trim().max(30, "紧急联系人电话过长").optional(),
    address: z.string().trim().max(200, "住址过长").optional(),
    medicalNotes: z.string().trim().max(1000, "健康备注过长").optional(),
  })
  .refine((data) => isNotFutureDate(data.birthDate), {
    message: "出生日期不能晚于今天",
    path: ["birthDate"],
  });
