import { z } from "zod";

export const familySchema = z.object({
  name: z.string().trim().min(1, "请输入家庭名称").max(40, "家庭名称过长"),
});

export const memberInviteSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  relationship: z.string().trim().max(30).optional(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});
