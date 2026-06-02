import { z } from "zod";

export const companionMessageSchema = z.object({
  content: z.string().trim().min(1, "请输入消息").max(1000, "消息过长"),
});
