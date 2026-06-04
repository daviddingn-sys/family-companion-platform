import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { abnormalEventSchema } from "@/lib/validators/abnormal-event";

async function validateRelatedBloodPressureRecord({
  admin,
  familyId,
  elderId,
  recordId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  familyId: string;
  elderId: string;
  recordId?: string;
}) {
  if (!recordId) return null;

  const { data, error } = await admin
    .from("blood_pressure_records")
    .select("id")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "关联血压记录不存在或不属于当前老人档案" }, { status: 400 });
  }

  return null;
}

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
    .from("abnormal_events")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ abnormalEvents: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
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
  const relatedRecordError = await validateRelatedBloodPressureRecord({
    admin,
    familyId,
    elderId,
    recordId: parsed.data.relatedBloodPressureRecordId,
  });
  if (relatedRecordError) return relatedRecordError;

  const { data, error } = await admin
    .from("abnormal_events")
    .insert({
      family_id: familyId,
      elder_id: elderId,
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      severity: parsed.data.severity,
      occurred_at: new Date(parsed.data.occurredAt).toISOString(),
      status: parsed.data.status,
      description: parsed.data.description || null,
      related_blood_pressure_record_id: parsed.data.relatedBloodPressureRecordId || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ abnormalEvent: data }, { status: 201 });
}
