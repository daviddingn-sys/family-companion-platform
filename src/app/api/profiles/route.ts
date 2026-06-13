import { NextRequest, NextResponse } from "next/server";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";
import { phoneToAuthEmail } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileSchema } from "@/lib/validators/profile";

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,display_name,phone,avatar_url,created_at,updated_at")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: phoneToAuthEmail(parsed.data.phone),
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      display_name: parsed.data.displayName,
      phone: parsed.data.phone,
      avatar_url: parsed.data.avatarUrl || null,
    },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const { data, error } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: parsed.data.displayName,
        phone: parsed.data.phone,
        avatar_url: parsed.data.avatarUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id,display_name,phone,avatar_url,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
