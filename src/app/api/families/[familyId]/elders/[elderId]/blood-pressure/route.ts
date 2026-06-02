import { NextRequest, NextResponse } from "next/server";
import { createBloodPressureAbnormalEvents } from "@/lib/abnormal-events";
import { summarizeBloodPressure } from "@/lib/blood-pressure";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bloodPressureSchema, getMonthRange } from "@/lib/validators/blood-pressure";

async function requireElderInFamily(familyId: string, elderId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("elders")
    .select("id")
    .eq("family_id", familyId)
    .eq("id", elderId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  if (!(await requireElderInFamily(familyId, elderId))) {
    return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  }

  const month = request.nextUrl.searchParams.get("month");
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("blood_pressure_records")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("measured_at", { ascending: false })
    .limit(300);

  if (month) {
    const range = getMonthRange(month);
    if (!range) return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    query = query.gte("measured_at", range.start).lt("measured_at", range.end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    records: data ?? [],
    summary: summarizeBloodPressure(data ?? []),
  });
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

  if (!(await requireElderInFamily(familyId, elderId))) {
    return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bloodPressureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("blood_pressure_records")
    .insert({
      family_id: familyId,
      elder_id: elderId,
      recorded_by: user.id,
      measured_at: parsed.data.measuredAt,
      period: parsed.data.period,
      systolic: parsed.data.systolic,
      diastolic: parsed.data.diastolic,
      pulse: parsed.data.pulse,
      image_key: parsed.data.imageKey || null,
      source: parsed.data.source,
      status: parsed.data.status,
      note: parsed.data.note || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const abnormalEventResult = await createBloodPressureAbnormalEvents([data]);
  return NextResponse.json(
    {
      record: data,
      abnormalEventsCreated: abnormalEventResult.created,
      abnormalEventError: abnormalEventResult.error?.message ?? null,
    },
    { status: 201 },
  );
}
