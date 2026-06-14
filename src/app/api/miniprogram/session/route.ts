import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMiniprogramSessionToken } from "@/lib/miniprogram-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  exchangeWechatMiniprogramCode,
  getMissingWechatMiniprogramEnvKeys,
} from "@/lib/wechat-miniprogram";

const sessionSchema = z.object({
  code: z.string().min(1, "缺少微信登录 code"),
});

export async function POST(request: NextRequest) {
  const missing = getMissingWechatMiniprogramEnvKeys();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "微信小程序配置尚未完成。",
        status: "missing_wechat_miniprogram_env",
        missingRequiredEnv: missing,
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let wechatSession: Awaited<ReturnType<typeof exchangeWechatMiniprogramCode>>;
  try {
    wechatSession = await exchangeWechatMiniprogramCode(parsed.data.code);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "微信登录 code 校验失败" },
      { status: 502 },
    );
  }

  const appid = process.env.WECHAT_MINIPROGRAM_APPID!;
  const admin = createSupabaseAdminClient();
  const { data: identity, error } = await admin
    .from("wechat_identities")
    .select("id,user_id,openid,appid")
    .eq("appid", appid)
    .eq("openid", wechatSession.openid)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!identity) {
    return NextResponse.json(
      {
        error: "该微信身份尚未绑定平台账号。",
        status: "wechat_identity_not_bound",
      },
      { status: 403 },
    );
  }

  await admin
    .from("wechat_identities")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", identity.id);

  return NextResponse.json({
    token: createMiniprogramSessionToken({
      userId: identity.user_id,
      openid: identity.openid,
      appid: identity.appid,
    }),
    tokenType: "Bearer",
    expiresIn: 60 * 60 * 24 * 7,
  });
}
