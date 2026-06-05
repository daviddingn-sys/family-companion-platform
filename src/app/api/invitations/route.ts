import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNoRowsError } from "@/lib/supabase/errors";

const acceptInvitationSchema = z.object({
  memberId: z.string().uuid("邀请 ID 格式不正确"),
});

const MAX_INVITATIONS = 100;

async function getCurrentProfilePhone(userId: string) {
  const admin = createSupabaseAdminClient();
  return admin.from("profiles").select("phone").eq("id", userId).maybeSingle();
}

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const ensuredProfile = await ensureRouteProfile(user);
  if (ensuredProfile) return ensuredProfile;

  const email = user.email?.toLowerCase() ?? "";
  const { data: profile, error: profileError } = await getCurrentProfilePhone(user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const phone = profile?.phone ?? null;
  const filters = email ? [`invited_email.eq.${email}`] : [];
  if (phone) filters.push(`invited_phone.eq.${phone}`);

  if (filters.length === 0) {
    return NextResponse.json({ invitations: [] });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select("id,role,relationship,status,invited_email,invited_phone,created_at,families(id,name)")
    .eq("status", "invited")
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(MAX_INVITATIONS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const ensuredProfile = await ensureRouteProfile(user);
  if (ensuredProfile) return ensuredProfile;

  const body = await request.json().catch(() => null);
  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const email = user.email?.toLowerCase() ?? "";
  const { data: profile, error: profileError } = await getCurrentProfilePhone(user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const phone = profile?.phone ?? null;
  const admin = createSupabaseAdminClient();
  const { data: invitation, error: invitationError } = await admin
    .from("family_members")
    .select("id,family_id,status,invited_email,invited_phone")
    .eq("id", parsed.data.memberId)
    .single();

  if (isNoRowsError(invitationError)) return NextResponse.json({ error: "邀请不存在或已处理" }, { status: 404 });
  if (invitationError) return NextResponse.json({ error: invitationError.message }, { status: 500 });
  if (!invitation || invitation.status !== "invited") {
    return NextResponse.json({ error: "邀请不存在或已处理" }, { status: 404 });
  }

  const emailMatches = invitation.invited_email?.toLowerCase() === email;
  const phoneMatches = Boolean(phone && invitation.invited_phone === phone);
  if (!emailMatches && !phoneMatches) {
    return NextResponse.json({ error: "当前账号与邀请信息不匹配" }, { status: 403 });
  }

  const { data: existing, error: existingError } = await admin
    .from("family_members")
    .select("id,status")
    .eq("family_id", invitation.family_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1);

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if ((existing?.length ?? 0) > 0) {
    return NextResponse.json({ error: "你已经是该家庭成员" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("family_members")
    .update({
      user_id: user.id,
      status: "active",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .eq("status", "invited")
    .is("user_id", null)
    .select("id,family_id,role,relationship,status,joined_at")
    .single();

  if (isNoRowsError(error)) return NextResponse.json({ error: "邀请不存在或已处理" }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
