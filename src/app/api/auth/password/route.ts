import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteUser } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const passwordSchema = z.object({
  password: z.string().min(6, "新密码至少 6 位").max(72, "新密码过长"),
});

export async function PATCH(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
