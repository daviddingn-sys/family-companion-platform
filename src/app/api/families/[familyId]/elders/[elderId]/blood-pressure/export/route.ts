import { NextRequest, NextResponse } from "next/server";
import {
  createAttachmentHeaders,
  createCalendarWorkbookBuffer,
  createDetailCsv,
  createDetailWorkbookBuffer,
  currentPlatformMonth,
  MAX_BLOOD_PRESSURE_EXPORT_ROWS,
  type BloodPressureExportRecord,
} from "@/lib/blood-pressure-export";
import { writeOperationLog } from "@/lib/operation-logs";
import { getRouteUser, requireElderInFamily, requireFamilyMember } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMonthRange } from "@/lib/validators/blood-pressure";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const requestedMonth = request.nextUrl.searchParams.get("month");
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const month = format === "calendar" ? (requestedMonth ?? currentPlatformMonth()) : requestedMonth;
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("blood_pressure_records")
    .select("measured_at,period,systolic,diastolic,pulse,source,status,note")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("measured_at", { ascending: true })
    .limit(MAX_BLOOD_PRESSURE_EXPORT_ROWS + 1);

  if (month) {
    const range = getMonthRange(month);
    if (!range) return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    query = query.gte("measured_at", range.start).lt("measured_at", range.end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if ((data?.length ?? 0) > MAX_BLOOD_PRESSURE_EXPORT_ROWS) {
    return NextResponse.json(
      { error: `单次最多导出 ${MAX_BLOOD_PRESSURE_EXPORT_ROWS} 条记录，请按月份筛选后再导出` },
      { status: 400 },
    );
  }

  const records = (data ?? []) as BloodPressureExportRecord[];
  await writeOperationLog({
    actorUserId: user.id,
    familyId,
    elderId,
    action: "export",
    resourceType: "blood_pressure_record",
    source: "web",
    request,
    metadata: {
      format,
      month: month ?? null,
      recordCount: records.length,
    },
  });

  if (format === "calendar") {
    if (!month) return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    const buffer = createCalendarWorkbookBuffer(records, month);
    return new NextResponse(new Uint8Array(buffer), {
      headers: createAttachmentHeaders(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        `血压月历记录_${month}.xlsx`,
      ),
    });
  }

  if (format === "xlsx") {
    const buffer = createDetailWorkbookBuffer(records);
    return new NextResponse(new Uint8Array(buffer), {
      headers: createAttachmentHeaders(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        `血压明细记录_${month ?? "all"}.xlsx`,
      ),
    });
  }

  if (format !== "csv") {
    return NextResponse.json({ error: "导出格式仅支持 csv、xlsx 或 calendar" }, { status: 400 });
  }

  return new NextResponse(createDetailCsv(records), {
    headers: createAttachmentHeaders("text/csv; charset=utf-8", `血压明细记录_${month ?? "all"}.csv`),
  });
}
