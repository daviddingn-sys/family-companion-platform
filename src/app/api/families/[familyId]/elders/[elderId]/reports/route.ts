import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { healthReportSchema } from "@/lib/validators/health-report";

const MAX_HEALTH_REPORTS = 120;

type BloodPressureRecord = {
  systolic: number;
  diastolic: number;
  pulse: number;
};

type AbnormalEvent = {
  severity: string;
  status: string;
};

type Reminder = {
  status: string;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function endExclusive(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

function buildSummary({
  periodType,
  periodStart,
  periodEnd,
  bloodPressureRecords,
  medicationCount,
  reminders,
  abnormalEvents,
}: {
  periodType: string;
  periodStart: string;
  periodEnd: string;
  bloodPressureRecords: BloodPressureRecord[];
  medicationCount: number;
  reminders: Reminder[];
  abnormalEvents: AbnormalEvent[];
}) {
  const systolicValues = bloodPressureRecords.map((record) => record.systolic);
  const diastolicValues = bloodPressureRecords.map((record) => record.diastolic);
  const pulseValues = bloodPressureRecords.map((record) => record.pulse);
  const avgSystolic = average(systolicValues);
  const avgDiastolic = average(diastolicValues);
  const avgPulse = average(pulseValues);
  const highSeverityCount = abnormalEvents.filter((event) => event.severity === "high" || event.severity === "critical").length;
  const openAbnormalCount = abnormalEvents.filter((event) => event.status !== "resolved").length;
  const doneReminderCount = reminders.filter((reminder) => reminder.status === "done").length;

  const summaryLines = [
    `${periodType === "weekly" ? "周报" : "月报"}周期：${periodStart} 至 ${periodEnd}。`,
    bloodPressureRecords.length > 0
      ? `本周期记录血压 ${bloodPressureRecords.length} 次，平均血压 ${avgSystolic}/${avgDiastolic} mmHg，平均脉搏 ${avgPulse} 次/分。`
      : "本周期暂无血压记录。",
    `当前记录中的用药方案 ${medicationCount} 项。`,
    reminders.length > 0
      ? `本周期提醒事项 ${reminders.length} 项，已完成 ${doneReminderCount} 项。`
      : "本周期暂无提醒事项。",
    abnormalEvents.length > 0
      ? `本周期异常记录 ${abnormalEvents.length} 条，其中高风险/紧急 ${highSeverityCount} 条，未解决 ${openAbnormalCount} 条。`
      : "本周期暂无异常记录。",
  ];

  return {
    summary: summaryLines.join("\n"),
    stats: {
      bloodPressure: {
        count: bloodPressureRecords.length,
        avgSystolic,
        avgDiastolic,
        avgPulse,
        maxSystolic: systolicValues.length ? Math.max(...systolicValues) : null,
        maxDiastolic: diastolicValues.length ? Math.max(...diastolicValues) : null,
        minSystolic: systolicValues.length ? Math.min(...systolicValues) : null,
        minDiastolic: diastolicValues.length ? Math.min(...diastolicValues) : null,
      },
      medications: {
        activeCount: medicationCount,
      },
      reminders: {
        count: reminders.length,
        byStatus: countBy(reminders.map((reminder) => reminder.status)),
      },
      abnormalEvents: {
        count: abnormalEvents.length,
        bySeverity: countBy(abnormalEvents.map((event) => event.severity)),
        byStatus: countBy(abnormalEvents.map((event) => event.status)),
      },
    },
  };
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

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("health_reports")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("period_start", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_HEALTH_REPORTS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
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
  const parsed = healthReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { periodType, periodStart, periodEnd } = parsed.data;
  const startAt = new Date(`${periodStart}T00:00:00.000Z`).toISOString();
  const endAt = endExclusive(periodEnd);
  const admin = createSupabaseAdminClient();

  const { data: existingReport, error: existingReportError } = await admin
    .from("health_reports")
    .select("id")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (existingReportError) return NextResponse.json({ error: existingReportError.message }, { status: 500 });
  if (existingReport) {
    return NextResponse.json({ error: "该周期健康报告已存在，请先删除原报告后重新生成" }, { status: 409 });
  }

  const [
    bloodPressureResult,
    medicationResult,
    reminderResult,
    abnormalEventResult,
  ] = await Promise.all([
    admin
      .from("blood_pressure_records")
      .select("systolic,diastolic,pulse")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .gte("measured_at", startAt)
      .lt("measured_at", endAt),
    admin
      .from("medications")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .eq("status", "active"),
    admin
      .from("reminders")
      .select("status")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .gte("due_at", startAt)
      .lt("due_at", endAt),
    admin
      .from("abnormal_events")
      .select("severity,status")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .gte("occurred_at", startAt)
      .lt("occurred_at", endAt),
  ]);

  const firstError =
    bloodPressureResult.error ??
    medicationResult.error ??
    reminderResult.error ??
    abnormalEventResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const { summary, stats } = buildSummary({
    periodType,
    periodStart,
    periodEnd,
    bloodPressureRecords: (bloodPressureResult.data ?? []) as BloodPressureRecord[],
    medicationCount: medicationResult.count ?? 0,
    reminders: (reminderResult.data ?? []) as Reminder[],
    abnormalEvents: (abnormalEventResult.data ?? []) as AbnormalEvent[],
  });

  const title = `${periodType === "weekly" ? "健康周报" : "健康月报"} ${periodStart} 至 ${periodEnd}`;
  const { data, error } = await admin
    .from("health_reports")
    .insert({
      family_id: familyId,
      elder_id: elderId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      title,
      summary,
      stats,
      generated_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data }, { status: 201 });
}
