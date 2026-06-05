import { NextRequest, NextResponse } from "next/server";
import { validateRelatedBloodPressureRecord } from "@/lib/abnormal-events";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { platformLocalMinuteToUtcIso } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";
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

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("abnormal_events")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", eventId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "异常记录不存在" }, { status: 404 });
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

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const body = await request.json().catch(() => null);
  const parsed = abnormalEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const occurredAt = platformLocalMinuteToUtcIso(parsed.data.occurredAt);
  if (!occurredAt) {
    return NextResponse.json({ error: "发生时间格式不正确" }, { status: 400 });
  }

  const relatedRecord = await validateRelatedBloodPressureRecord({
    admin,
    familyId,
    elderId,
    recordId: parsed.data.relatedBloodPressureRecordId,
  });
  if (!relatedRecord.ok) {
    return NextResponse.json({ error: relatedRecord.error }, { status: relatedRecord.status });
  }

  const { data, error } = await admin
    .from("abnormal_events")
    .update({
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      severity: parsed.data.severity,
      occurred_at: occurredAt,
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

  if (isNoRowsError(error)) return NextResponse.json({ error: "异常记录不存在" }, { status: 404 });
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

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("abnormal_events")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", eventId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "异常记录不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
