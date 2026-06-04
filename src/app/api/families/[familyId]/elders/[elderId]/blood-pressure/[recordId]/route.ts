import { NextRequest, NextResponse } from "next/server";
import { syncBloodPressureAbnormalEvent } from "@/lib/abnormal-events";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";
import { bloodPressureSchema } from "@/lib/validators/blood-pressure";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; recordId: string }> },
) {
  const { familyId, elderId, recordId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("blood_pressure_records")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", recordId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "血压记录不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; recordId: string }> },
) {
  const { familyId, elderId, recordId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const body = await request.json().catch(() => null);
  const parsed = bloodPressureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("blood_pressure_records")
    .update({
      measured_at: parsed.data.measuredAt,
      period: parsed.data.period,
      systolic: parsed.data.systolic,
      diastolic: parsed.data.diastolic,
      pulse: parsed.data.pulse,
      image_key: parsed.data.imageKey || null,
      source: parsed.data.source,
      status: parsed.data.status,
      note: parsed.data.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", recordId)
    .select("*")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "血压记录不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const abnormalEventResult = await syncBloodPressureAbnormalEvent(data);
  return NextResponse.json({
    record: data,
    abnormalEventsCreated: abnormalEventResult.created,
    abnormalEventsUpdated: abnormalEventResult.updated,
    abnormalEventError: abnormalEventResult.error?.message ?? null,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; recordId: string }> },
) {
  const { familyId, elderId, recordId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { error: abnormalEventError } = await admin
    .from("abnormal_events")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("event_type", "blood_pressure")
    .eq("related_blood_pressure_record_id", recordId);
  if (abnormalEventError) {
    return NextResponse.json({ error: abnormalEventError.message }, { status: 500 });
  }

  const { error } = await admin
    .from("blood_pressure_records")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", recordId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "血压记录不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
