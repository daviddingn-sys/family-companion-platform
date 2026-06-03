import { NextRequest, NextResponse } from "next/server";
import { generateCompanionReply } from "@/lib/ai-companion";
import { getRouteUser, requireElderInFamily, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { companionMessageSchema } from "@/lib/validators/companion-message";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("companion_messages")
    .select("*")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = companionMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const admin = createSupabaseAdminClient();
  const { data: recentMessages, error: recentError } = await admin
    .from("companion_messages")
    .select("role,content")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (recentError) return NextResponse.json({ error: recentError.message }, { status: 500 });

  const { data: userMessage, error: userMessageError } = await admin
    .from("companion_messages")
    .insert({
      family_id: familyId,
      elder_id: elderId,
      role: "user",
      content: parsed.data.content,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (userMessageError) return NextResponse.json({ error: userMessageError.message }, { status: 500 });

  const replyResult = await generateCompanionReply({
    elderName: elder.name,
    userMessage: parsed.data.content,
    recentMessages: (recentMessages ?? []).slice().reverse(),
  });

  const { data: assistantMessage, error: assistantMessageError } = await admin
    .from("companion_messages")
    .insert({
      family_id: familyId,
      elder_id: elderId,
      role: "assistant",
      content: replyResult.reply,
      model: replyResult.model,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (assistantMessageError) {
    return NextResponse.json({ error: assistantMessageError.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: [userMessage, assistantMessage],
    usedAi: replyResult.usedAi,
  }, { status: 201 });
}
