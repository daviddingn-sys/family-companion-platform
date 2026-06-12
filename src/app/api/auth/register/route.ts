import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeChinaPhoneToE164, phoneToAuthEmail } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const registerSchema = z.object({
  displayName: z.string().trim().max(40, "姓名过长").optional(),
  phone: z.string().trim().min(1, "请输入手机号"),
  password: z.string().min(6, "密码至少 6 位").max(72, "密码过长"),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const normalizedPhone = normalizeChinaPhoneToE164(parsed.data.phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "请输入有效的中国大陆手机号" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const email = phoneToAuthEmail(normalizedPhone);
  const displayName = parsed.data.displayName?.trim() || normalizedPhone;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      phone: normalizedPhone,
    },
  });

  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message)) {
      return NextResponse.json({ error: "该手机号已注册，请直接登录。" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      display_name: displayName,
      phone: normalizedPhone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
