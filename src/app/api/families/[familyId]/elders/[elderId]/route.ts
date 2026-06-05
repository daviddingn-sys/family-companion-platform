import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { elderSchema } from "@/lib/validators/elder";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("elders")
    .select("*")
    .eq("family_id", familyId)
    .eq("id", elderId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ elder: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = elderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("elders")
    .update({
      name: parsed.data.name,
      gender: parsed.data.gender,
      birth_date: parsed.data.birthDate || null,
      phone: parsed.data.phone || null,
      emergency_contact_name: parsed.data.emergencyContactName || null,
      emergency_contact_phone: parsed.data.emergencyContactPhone || null,
      address: parsed.data.address || null,
      medical_notes: parsed.data.medicalNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId)
    .eq("id", elderId)
    .select("*")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ elder: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  if (body?.confirm !== "DELETE_ELDER") {
    return NextResponse.json({ error: "删除老人档案需要确认" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("elders")
    .delete()
    .eq("family_id", familyId)
    .eq("id", elderId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
