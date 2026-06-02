import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "请输入姓名").max(40, "姓名过长"),
  phone: z.string().trim().max(30, "手机号过长").optional(),
  avatarUrl: z.string().trim().url("头像地址格式不正确").optional().or(z.literal("")),
});
