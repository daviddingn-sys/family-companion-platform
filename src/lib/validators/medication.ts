import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "请输入药品名称").max(80, "药品名称过长"),
  dosage: z.string().trim().max(80, "剂量过长").optional(),
  frequency: z.string().trim().max(120, "频次过长").optional(),
  instructions: z.string().trim().max(300, "用药说明过长").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["active", "paused", "stopped"]).default("active"),
  note: z.string().trim().max(500, "备注过长").optional(),
});
