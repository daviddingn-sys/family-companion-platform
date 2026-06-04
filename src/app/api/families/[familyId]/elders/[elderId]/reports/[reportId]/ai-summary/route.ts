import { NextRequest, NextResponse } from "next/server";
import { generateAiHealthSummary } from "@/lib/ai-health-summary";
import { getRouteUser, requireElderInFamily, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reportId: string }> },
) {
  const { familyId, elderId, reportId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data: report, error: reportError } = await admin
    .from("health_reports")
    .select("id,title,summary,stats")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reportId)
    .single();

  if (isNoRowsError(reportError)) return NextResponse.json({ error: "健康报告不存在" }, { status: 404 });
  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });

  const result = await generateAiHealthSummary(report);
  const { data, error } = await admin
    .from("health_reports")
    .update({
      ai_summary: result.summary,
      ai_model: result.model,
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data, usedAi: result.usedAi });
}
