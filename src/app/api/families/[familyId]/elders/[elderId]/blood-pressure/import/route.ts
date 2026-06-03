import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createBloodPressureAbnormalEvents } from "@/lib/abnormal-events";
import { parseBloodPressureRows } from "@/lib/blood-pressure-import";
import { getRouteUser, requireElderInFamily, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMPORT_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  const hasSupportedExtension = fileName.endsWith(".csv") || fileName.endsWith(".xls") || fileName.endsWith(".xlsx");
  if (!hasSupportedExtension && !SUPPORTED_IMPORT_TYPES.has(file.type)) {
    return NextResponse.json({ error: "仅支持 CSV、XLS、XLSX 文件" }, { status: 400 });
  }

  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return NextResponse.json({ error: "导入文件不能超过 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const parsedRows = parseBloodPressureRows(rows);
  const validRows = parsedRows.filter((row) => row.valid && row.data);
  const invalidRows = parsedRows.filter((row) => !row.valid);

  const admin = createSupabaseAdminClient();
  const inserts = validRows.map((row) => ({
    family_id: familyId,
    elder_id: elderId,
    recorded_by: user.id,
    measured_at: row.data!.measuredAt,
    period: row.data!.period,
    systolic: row.data!.systolic,
    diastolic: row.data!.diastolic,
    pulse: row.data!.pulse,
    source: "excel",
    status: "confirmed",
    note: row.data!.note || null,
  }));

  let inserted = 0;
  let insertError: string | null = null;
  let abnormalEventsCreated = 0;
  let abnormalEventError: string | null = null;
  if (inserts.length > 0) {
    const { data, error } = await admin
      .from("blood_pressure_records")
      .insert(inserts)
      .select("id,family_id,elder_id,recorded_by,measured_at,systolic,diastolic,pulse");
    inserted = data?.length ?? 0;
    insertError = error?.message ?? null;
    if (data && data.length > 0) {
      const abnormalEventResult = await createBloodPressureAbnormalEvents(data);
      abnormalEventsCreated = abnormalEventResult.created;
      abnormalEventError = abnormalEventResult.error?.message ?? null;
    }
  }

  return NextResponse.json({
    total: rows.length,
    parsed: parsedRows.length,
    inserted,
    abnormalEventsCreated,
    failed: invalidRows.length,
    insertError,
    abnormalEventError,
    errors: invalidRows.slice(0, 20).map((row) => `第${row.rowNumber}行：${row.error}`),
  });
}
