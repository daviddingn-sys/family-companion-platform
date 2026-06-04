import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRouteUser, requireFamilyMember, requireFamilyRole } from "@/lib/permissions";
import { memberInviteSchema } from "@/lib/validators/family";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select("id,role,relationship,status,invited_email,invited_phone,joined_at,created_at,profiles(id,display_name,phone,avatar_url)")
    .eq("family_id", familyId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = memberInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!parsed.data.email && !parsed.data.phone) {
    return NextResponse.json({ error: "请输入邮箱或手机号" }, { status: 400 });
  }

  if (membership.role !== "owner" && parsed.data.role === "admin") {
    return NextResponse.json({ error: "只有家庭所有者可以邀请管理员" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : "";
  const duplicateFilters = [];
  if (email) duplicateFilters.push(`invited_email.eq.${email}`);
  if (parsed.data.phone) duplicateFilters.push(`invited_phone.eq.${parsed.data.phone}`);

  if (duplicateFilters.length > 0) {
    const { data: duplicate, error: duplicateError } = await admin
      .from("family_members")
      .select("id")
      .eq("family_id", familyId)
      .neq("status", "removed")
      .or(duplicateFilters.join(","))
      .maybeSingle();

    if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
    if (duplicate) {
      return NextResponse.json({ error: "该成员已在家庭中或已有待处理邀请" }, { status: 409 });
    }
  }

  const { data, error } = await admin
    .from("family_members")
    .insert({
      family_id: familyId,
      user_id: null,
      role: parsed.data.role,
      relationship: parsed.data.relationship || null,
      status: "invited",
      invited_email: email || null,
      invited_phone: parsed.data.phone || null,
    })
    .select("id,role,relationship,status,invited_email,invited_phone,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
