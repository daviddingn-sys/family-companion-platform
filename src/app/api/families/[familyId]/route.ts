import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { familySchema } from "@/lib/validators/family";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("families")
    .select("id,name,owner_user_id,created_at,updated_at")
    .eq("id", familyId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ family: data, membership });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("families")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", familyId)
    .select("id,name,owner_user_id,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ family: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner"]);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("families").delete().eq("id", familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
