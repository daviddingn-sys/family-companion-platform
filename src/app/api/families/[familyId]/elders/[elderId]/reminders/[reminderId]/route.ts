import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { platformLocalMinuteToUtcIso } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";
import { reminderSchema } from "@/lib/validators/reminder";

function parseDueAt(value?: string) {
  if (!value?.trim()) return null;
  return platformLocalMinuteToUtcIso(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reminderId: string }> },
) {
  const { familyId, elderId, reminderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("reminders")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reminderId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminder: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reminderId: string }> },
) {
  const { familyId, elderId, reminderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const body = await request.json().catch(() => null);
  const parsed = reminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("reminders")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      due_at: parseDueAt(parsed.data.dueAt),
      repeat_rule: parsed.data.repeatRule || null,
      status: parsed.data.status,
      note: parsed.data.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reminderId)
    .select("*")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminder: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string; reminderId: string }> },
) {
  const { familyId, elderId, reminderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("reminders")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", reminderId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
