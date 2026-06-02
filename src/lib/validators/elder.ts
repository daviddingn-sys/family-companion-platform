import { z } from "zod";

export const elderSchema = z.object({
  name: z.string().trim().min(1, "请输入老人姓名").max(40, "姓名过长"),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  birthDate: z.string().optional(),
  phone: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  medicalNotes: z.string().trim().optional(),
});
