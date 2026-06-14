import { NextRequest, NextResponse } from "next/server";
import { createAttachmentHeaders } from "@/lib/blood-pressure-export";
import { writeOperationLog } from "@/lib/operation-logs";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  const admin = createSupabaseAdminClient();
  const { data: memberships, error: membershipsError } = await admin
    .from("family_members")
    .select("family_id,role,families(id,name,created_at,updated_at)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipsError) return NextResponse.json({ error: membershipsError.message }, { status: 500 });

  const familyIds = (memberships ?? []).map((membership) => membership.family_id);
  const [membersResult, bloodPressureResult, remindersResult, medicationsResult, abnormalEventsResult, reportsResult] =
    familyIds.length
      ? await Promise.all([
          admin.from("elders").select("*").in("family_id", familyIds),
          admin.from("blood_pressure_records").select("*").in("family_id", familyIds),
          admin.from("reminders").select("*").in("family_id", familyIds),
          admin.from("medications").select("*").in("family_id", familyIds),
          admin.from("abnormal_events").select("*").in("family_id", familyIds),
          admin.from("health_reports").select("*").in("family_id", familyIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  for (const result of [membersResult, bloodPressureResult, remindersResult, medicationsResult, abnormalEventsResult, reportsResult]) {
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    source: "web",
    families: memberships ?? [],
    members: membersResult.data ?? [],
    bloodPressureRecords: bloodPressureResult.data ?? [],
    reminders: remindersResult.data ?? [],
    medications: medicationsResult.data ?? [],
    abnormalEvents: abnormalEventsResult.data ?? [],
    healthReports: reportsResult.data ?? [],
  };

  await writeOperationLog({
    actorUserId: user.id,
    action: "export",
    resourceType: "all_user_data",
    source: "web",
    request,
    metadata: {
      familyCount: familyIds.length,
      exportedAt,
    },
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: createAttachmentHeaders("application/json; charset=utf-8", `家庭陪伴平台数据导出_${exportedAt.slice(0, 10)}.json`),
  });
}
