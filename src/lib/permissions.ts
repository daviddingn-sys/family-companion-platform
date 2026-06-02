import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FamilyRole = "owner" | "admin" | "member" | "viewer";

export async function getRouteUser(): Promise<User | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return user;
}

export async function ensureProfile(user: User) {
  const admin = createSupabaseAdminClient();
  const profile = {
    id: user.id,
    display_name:
      user.user_metadata?.display_name ??
      user.email?.split("@")[0] ??
      "家庭成员",
    phone: user.phone ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  await admin.from("profiles").upsert(profile, { onConflict: "id" });
}

export async function getFamilyMembership(familyId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select("id, family_id, user_id, role, status")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string; role: FamilyRole; status: string } | null;
}

export async function requireFamilyMember(familyId: string, userId: string) {
  const membership = await getFamilyMembership(familyId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return membership;
}

export async function requireFamilyRole(
  familyId: string,
  userId: string,
  allowedRoles: FamilyRole[],
) {
  const membership = await getFamilyMembership(familyId, userId);
  if (!membership || !allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return membership;
}
