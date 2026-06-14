import { NextRequest, NextResponse } from "next/server";
import { getMiniprogramUser } from "@/lib/miniprogram-auth";
import { writeOperationLog } from "@/lib/operation-logs";
import { requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { platformLocalMinuteToUtcIso } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reminderSchema } from "@/lib/validators/reminder";

function parseDueAt(value?: string) {
  if (!value?.trim()) return null;
  return platformLocalMinuteToUtcIso(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
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
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminders: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
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
    .insert({
      family_id: familyId,
      elder_id: memberId,
      title: parsed.data.title,
      type: parsed.data.type,
      due_at: parseDueAt(parsed.data.dueAt),
      repeat_rule: parsed.data.repeatRule || null,
      status: parsed.data.status,
      note: parsed.data.note || null,
      created_by: miniUser.userId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOperationLog({
    actorUserId: miniUser.userId,
    familyId,
    elderId: memberId,
    action: "create",
    resourceType: "reminder",
    resourceId: data.id,
    source: "miniprogram",
    request,
    metadata: {
      type: data.type,
      dueAt: data.due_at,
    },
  });

  return NextResponse.json({ reminder: data }, { status: 201 });
}
