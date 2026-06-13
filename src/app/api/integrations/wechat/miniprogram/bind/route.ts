import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  exchangeWechatMiniprogramCode,
  getMissingWechatMiniprogramEnvKeys,
} from "@/lib/wechat-miniprogram";

const bindWechatSchema = z.object({
  code: z.string().min(1, "缺少微信登录 code"),
  nickname: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional(),
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

  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  const body = await request.json().catch(() => null);
  const parsed = bindWechatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let session: Awaited<ReturnType<typeof exchangeWechatMiniprogramCode>>;
  try {
    session = await exchangeWechatMiniprogramCode(parsed.data.code);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "微信登录 code 校验失败" },
      { status: 502 },
    );
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const appid = process.env.WECHAT_MINIPROGRAM_APPID!;
  const { data: existing, error: existingError } = await admin
    .from("wechat_identities")
    .select("id,user_id")
    .eq("appid", appid)
    .eq("openid", session.openid)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: "该微信身份已绑定其他平台账号。" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("wechat_identities")
    .upsert(
      {
        user_id: user.id,
        appid,
        openid: session.openid,
        unionid: session.unionid ?? null,
        nickname: parsed.data.nickname ?? null,
        avatar_url: parsed.data.avatarUrl ?? null,
        updated_at: now,
        last_login_at: now,
      },
      { onConflict: "appid,openid" },
    )
    .select("id,appid,openid,unionid,nickname,avatar_url,last_login_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ identity: data });
}
