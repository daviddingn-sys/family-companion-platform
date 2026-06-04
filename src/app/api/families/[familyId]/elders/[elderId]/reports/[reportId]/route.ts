import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reportId: string }> },
) {
  const { familyId, elderId, reportId } = await params;
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
    .eq("id", reportId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "健康报告不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (request.nextUrl.searchParams.get("format") === "markdown") {
    const lines = [
      `# ${data.title}`,
      "",
      `- 报告类型：${data.period_type === "weekly" ? "周报" : "月报"}`,
      `- 周期：${data.period_start} 至 ${data.period_end}`,
      `- 生成时间：${new Date(data.created_at).toLocaleString("zh-CN")}`,
      "",
      "## 规则化摘要",
      "",
      data.summary,
    ];

    if (data.ai_summary) {
      lines.push(
        "",
        "## AI 健康总结",
        "",
        data.ai_summary,
        "",
        `模型：${data.ai_model ?? "-"}`,
        `生成时间：${data.ai_generated_at ? new Date(data.ai_generated_at).toLocaleString("zh-CN") : "-"}`,
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="health_report_${data.period_start}_${data.period_end}.md"`,
      },
    });
  }

  return NextResponse.json({ report: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reportId: string }> },
) {
  const { familyId, elderId, reportId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("health_reports")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reportId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "健康报告不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
