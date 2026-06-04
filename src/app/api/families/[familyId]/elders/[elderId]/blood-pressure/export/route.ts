import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getRouteUser, requireElderInFamily, requireFamilyMember } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMonthRange } from "@/lib/validators/blood-pressure";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const month = request.nextUrl.searchParams.get("month");
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("blood_pressure_records")
    .select("measured_at,period,systolic,diastolic,pulse,source,status,note")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("measured_at", { ascending: true });

  if (month) {
    const range = getMonthRange(month);
    if (!range) return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    query = query.gte("measured_at", range.start).lt("measured_at", range.end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const header = ["测量时间", "时段", "高压", "低压", "脉搏", "来源", "状态", "备注"];
  const rows = (data ?? []).map((record) => [
    new Date(record.measured_at).toLocaleString("zh-CN"),
    record.period,
    record.systolic,
    record.diastolic,
    record.pulse,
    record.source,
    record.status,
    record.note ?? "",
  ]);

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "血压记录");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="blood_pressure_${month ?? "all"}.xlsx"`,
      },
    });
  }

  if (format !== "csv") {
    return NextResponse.json({ error: "导出格式仅支持 csv 或 xlsx" }, { status: 400 });
  }

  const csv = "\uFEFF" + [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blood_pressure_${month ?? "all"}.csv"`,
    },
  });
}
