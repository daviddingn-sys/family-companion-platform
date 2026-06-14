import { z } from "zod";
import { platformLocalMonthRangeToUtcIso } from "@/lib/platform-time";

export const bloodPressureSchema = z.object({
  measuredAt: z.string().datetime("测量时间格式不正确"),
  period: z.enum(["morning", "noon", "evening", "night"]),
  systolic: z.coerce.number().int().min(80, "高压过低").max(220, "高压过高"),
  diastolic: z.coerce.number().int().min(40, "低压过低").max(140, "低压过高"),
  pulse: z.coerce.number().int().min(35, "脉搏过低").max(200, "脉搏过高"),
  imageKey: z.string().trim().optional(),
  source: z.enum(["web", "manual", "ocr", "excel", "miniprogram"]).default("web"),
  status: z.enum(["confirmed", "pending"]).default("confirmed"),
  note: z.string().trim().optional(),
}).refine((data) => data.systolic > data.diastolic, {
  message: "高压必须大于低压",
  path: ["systolic"],
});

export type BloodPressureInput = z.infer<typeof bloodPressureSchema>;

export function getMonthRange(month: string) {
  return platformLocalMonthRangeToUtcIso(month);
}
