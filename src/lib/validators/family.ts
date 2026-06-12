import { z } from "zod";
import { normalizeChinaPhoneToE164 } from "@/lib/phone";

export const familySchema = z.object({
  name: z.string().trim().min(1, "请输入家庭名称").max(40, "家庭名称过长"),
});

export const memberInviteSchema = z.object({
  phone: z.string().trim().min(1, "请输入手机号").max(30, "手机号过长").transform((value, ctx) => {
    const normalized = normalizeChinaPhoneToE164(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "请输入有效的中国大陆手机号" });
      return z.NEVER;
    }
    return normalized;
  }),
  relationship: z.string().trim().max(30).optional(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});
