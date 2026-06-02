import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reportId: string }> },
) {
  const { familyId, elderId, reportId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("health_reports")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reportId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("health_reports")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
