import { NextRequest, NextResponse } from "next/server";
import { getMiniprogramUser } from "@/lib/miniprogram-auth";
import { writeOperationLog } from "@/lib/operation-logs";
import { requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { platformLocalMinuteToUtcIso } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";
import { reminderSchema } from "@/lib/validators/reminder";

function parseDueAt(value?: string) {
  if (!value?.trim()) return null;
  return platformLocalMinuteToUtcIso(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string; reminderId: string }> },
) {
  const { familyId, memberId, reminderId } = await params;
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const membership = await requireFamilyMember(familyId, miniUser.userId);
  if (membership instanceof NextResponse) return membership;

  const member = await requireElderInFamily(familyId, memberId);
  if (member instanceof NextResponse) return member;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("reminders")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", memberId)
    .eq("id", reminderId)
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminder: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string; reminderId: string }> },
) {
  const { familyId, memberId, reminderId } = await params;
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const membership = await requireFamilyRole(familyId, miniUser.userId, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const member = await requireElderInFamily(familyId, memberId);
  if (member instanceof NextResponse) return member;

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
    .eq("elder_id", memberId)
    .eq("id", reminderId)
    .select("*")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOperationLog({
    actorUserId: miniUser.userId,
    familyId,
    elderId: memberId,
    action: "update",
    resourceType: "reminder",
    resourceId: reminderId,
    source: "miniprogram",
    request,
    metadata: {
      type: data.type,
      status: data.status,
      dueAt: data.due_at,
    },
  });

  return NextResponse.json({ reminder: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string; reminderId: string }> },
) {
  const { familyId, memberId, reminderId } = await params;
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const membership = await requireFamilyRole(familyId, miniUser.userId, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const member = await requireElderInFamily(familyId, memberId);
  if (member instanceof NextResponse) return member;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("reminders")
    .delete()
    .eq("family_id", familyId)
    .eq("elder_id", memberId)
    .eq("id", reminderId)
    .select("id")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "提醒事项不存在" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOperationLog({
    actorUserId: miniUser.userId,
    familyId,
    elderId: memberId,
    action: "delete",
    resourceType: "reminder",
    resourceId: reminderId,
    source: "miniprogram",
    request,
  });

  return NextResponse.json({ ok: true });
}
