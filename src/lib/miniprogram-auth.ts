import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type MiniprogramSessionPayload = {
  userId: string;
  openid: string;
  appid: string;
  exp: number;
};

export type MiniprogramUser = {
  userId: string;
  openid: string;
  appid: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  return process.env.WECHAT_MINIPROGRAM_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function signPayload(encodedPayload: string) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Missing mini program session secret");
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createMiniprogramSessionToken(input: Omit<MiniprogramSessionPayload, "exp">) {
  const payload: MiniprogramSessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifyMiniprogramSessionToken(token: string): MiniprogramSessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as MiniprogramSessionPayload;
  if (!payload.userId || !payload.openid || !payload.appid || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export async function getMiniprogramUser(request: NextRequest): Promise<MiniprogramUser | NextResponse> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "缺少小程序会话 token。" }, { status: 401 });
  }

  let payload: MiniprogramSessionPayload | null = null;
  try {
    payload = verifyMiniprogramSessionToken(token);
  } catch {
    payload = null;
  }
  if (!payload) {
    return NextResponse.json({ error: "小程序会话已失效，请重新登录。" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("wechat_identities")
    .select("id")
    .eq("user_id", payload.userId)
    .eq("appid", payload.appid)
    .eq("openid", payload.openid)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "小程序身份未绑定平台账号。" }, { status: 403 });
  }

  return {
    userId: payload.userId,
    appid: payload.appid,
    openid: payload.openid,
  };
}
