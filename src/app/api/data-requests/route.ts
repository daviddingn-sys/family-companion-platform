import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeOperationLog } from "@/lib/operation-logs";
import { ensureRouteProfile, getRouteUser, requireFamilyMember } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const dataRequestSchema = z.object({
  requestType: z.enum(["export_all", "delete_all"]),
  familyId: z.string().uuid().optional(),
  note: z.string().trim().max(500, "说明过长").optional(),
});

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("data_requests")
    .select("id,family_id,request_type,status,source,note,created_at,updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  const body = await request.json().catch(() => null);
  const parsed = dataRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.familyId) {
    const membership = await requireFamilyMember(parsed.data.familyId, user.id);
    if (membership instanceof NextResponse) return membership;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("data_requests")
    .insert({
      user_id: user.id,
      family_id: parsed.data.familyId ?? null,
      request_type: parsed.data.requestType,
      status: "submitted",
      source: "web",
      note: parsed.data.note || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeOperationLog({
    actorUserId: user.id,
    familyId: parsed.data.familyId ?? null,
    action: "request",
    resourceType: "data_request",
    resourceId: data.id,
    source: "web",
    request,
    metadata: {
      requestType: parsed.data.requestType,
    },
  });

  return NextResponse.json({ request: data }, { status: 201 });
}
