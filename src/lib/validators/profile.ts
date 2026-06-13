import { z } from "zod";
import { normalizeChinaPhoneToE164 } from "@/lib/phone";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "请输入姓名").max(40, "姓名过长"),
  phone: z.string().trim().min(1, "请输入手机号").max(30, "手机号过长").transform((value, ctx) => {
    const normalized = normalizeChinaPhoneToE164(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "请输入有效的中国大陆手机号" });
      return z.NEVER;
    }
    return normalized;
  }),
  avatarUrl: z.string().trim().url("头像地址格式不正确").optional().or(z.literal("")),
});
