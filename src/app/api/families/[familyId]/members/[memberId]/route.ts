import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRouteUser, requireFamilyRole } from "@/lib/permissions";

const updateMemberSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]).optional(),
  relationship: z.string().trim().max(30).optional(),
  status: z.enum(["active", "invited", "removed"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from("family_members")
    .select("role,user_id")
    .eq("id", memberId)
    .eq("family_id", familyId)
    .single();

  if (!target || target.role === "owner") {
    return NextResponse.json({ error: "不能修改家庭所有者" }, { status: 400 });
  }

  if (membership.role !== "owner" && (target.role === "admin" || parsed.data.role === "admin")) {
    return NextResponse.json({ error: "只有家庭所有者可以调整管理员" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("family_members")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("family_id", familyId)
    .select("id,role,relationship,status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ familyId: string; memberId: string }> },
) {
  const { familyId, memberId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin"]);
  if (membership instanceof NextResponse) return membership;

  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from("family_members")
    .select("role")
    .eq("id", memberId)
    .eq("family_id", familyId)
    .single();

  if (!target || target.role === "owner") {
    return NextResponse.json({ error: "不能移除家庭所有者" }, { status: 400 });
  }

  if (membership.role !== "owner" && target.role === "admin") {
    return NextResponse.json({ error: "只有家庭所有者可以移除管理员" }, { status: 403 });
  }

  const { error } = await admin
    .from("family_members")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("family_id", familyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
