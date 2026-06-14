import { NextRequest, NextResponse } from "next/server";
import { createBloodPressureAbnormalEvents } from "@/lib/abnormal-events";
import { summarizeBloodPressure } from "@/lib/blood-pressure";
import { getMiniprogramUser } from "@/lib/miniprogram-auth";
import { writeOperationLog } from "@/lib/operation-logs";
import { requireElderInFamily, requireFamilyRole, requireFamilyMember } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bloodPressureSchema, getMonthRange } from "@/lib/validators/blood-pressure";

function getPlatformDayRange(value: string) {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const next = new Date(`${day}T00:00:00+08:00`);
  if (Number.isNaN(next.getTime())) return null;
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    start: new Date(`${day}T00:00:00+08:00`).toISOString(),
    end: next.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const membership = await requireFamilyMember(familyId, miniUser.userId);
  if (membership instanceof NextResponse) return membership;

  const member = await requireElderInFamily(familyId, memberId);
  if (member instanceof NextResponse) return member;

  const month = request.nextUrl.searchParams.get("month");
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 300);
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("blood_pressure_records")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", memberId)
    .order("measured_at", { ascending: false })
    .limit(limit);

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
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const membership = await requireFamilyRole(familyId, miniUser.userId, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const member = await requireElderInFamily(familyId, memberId);
  if (member instanceof NextResponse) return member;

  const body = await request.json().catch(() => null);
  const parsed = bloodPressureSchema.safeParse({
    ...(body ?? {}),
    source: "miniprogram",
    status: "confirmed",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const dayRange = getPlatformDayRange(parsed.data.measuredAt);
  if (!dayRange) return NextResponse.json({ error: "测量日期格式不正确" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: duplicate, error: duplicateError } = await admin
    .from("blood_pressure_records")
    .select("id,measured_at,period,systolic,diastolic,pulse,note")
    .eq("family_id", familyId)
    .eq("elder_id", memberId)
    .eq("period", parsed.data.period)
    .gte("measured_at", dayRange.start)
    .lt("measured_at", dayRange.end)
    .order("measured_at", { ascending: false })
    .limit(1);

  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
  if ((duplicate?.length ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "同一天同一时段已有记录，请确认后修改原记录或删除后重录。",
        status: "duplicate_period_record",
        existingRecord: duplicate?.[0],
      },
      { status: 409 },
    );
  }

  const { data, error } = await admin
    .from("blood_pressure_records")
    .insert({
      family_id: familyId,
      elder_id: memberId,
      recorded_by: miniUser.userId,
      measured_at: parsed.data.measuredAt,
      period: parsed.data.period,
      systolic: parsed.data.systolic,
      diastolic: parsed.data.diastolic,
      pulse: parsed.data.pulse,
      image_key: parsed.data.imageKey || null,
      source: "miniprogram",
      status: "confirmed",
      note: parsed.data.note || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOperationLog({
    actorUserId: miniUser.userId,
    familyId,
    elderId: memberId,
    action: "create",
    resourceType: "blood_pressure_record",
    resourceId: data.id,
    source: "miniprogram",
    request,
    metadata: {
      period: data.period,
      measuredAt: data.measured_at,
    },
  });

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
