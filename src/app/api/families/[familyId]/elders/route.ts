import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { elderSchema } from "@/lib/validators/elder";

const MAX_ELDERS = 100;

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
    .from("elders")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true })
    .limit(MAX_ELDERS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ elders: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
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
    .insert({
      family_id: familyId,
      name: parsed.data.name,
      gender: parsed.data.gender,
      birth_date: parsed.data.birthDate || null,
      phone: parsed.data.phone || null,
      emergency_contact_name: parsed.data.emergencyContactName || null,
      emergency_contact_phone: parsed.data.emergencyContactPhone || null,
      address: parsed.data.address || null,
      medical_notes: parsed.data.medicalNotes || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ elder: data }, { status: 201 });
}
