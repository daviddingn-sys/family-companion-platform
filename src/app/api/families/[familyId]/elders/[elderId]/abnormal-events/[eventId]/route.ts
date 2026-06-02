import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { abnormalEventSchema } from "@/lib/validators/abnormal-event";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; eventId: string }> },
) {
  const { familyId, elderId, eventId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("abnormal_events")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", eventId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ abnormalEvent: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; eventId: string }> },
) {
  const { familyId, elderId, eventId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = abnormalEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("abnormal_events")
    .update({
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      severity: parsed.data.severity,
      occurred_at: new Date(parsed.data.occurredAt).toISOString(),
      status: parsed.data.status,
      description: parsed.data.description || null,
      related_blood_pressure_record_id: parsed.data.relatedBloodPressureRecordId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ abnormalEvent: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; eventId: string }> },
) {
  const { familyId, elderId, eventId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("abnormal_events")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
