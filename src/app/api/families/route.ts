import { NextRequest, NextResponse } from "next/server";
import { familySchema } from "@/lib/validators/family";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfile, getRouteUser } from "@/lib/permissions";

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  await ensureProfile(user);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select("role,status,families(id,name,owner_user_id,created_at,updated_at)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ families: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  await ensureProfile(user);
  const body = await request.json().catch(() => null);
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({
      name: parsed.data.name,
      owner_user_id: user.id,
    })
    .select("id,name,owner_user_id,created_at,updated_at")
    .single();

  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message ?? "创建家庭失败" }, { status: 500 });
  }

  const { error: memberError } = await admin.from("family_members").insert({
    family_id: family.id,
    user_id: user.id,
    role: "owner",
    relationship: "创建者",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ family }, { status: 201 });
}
