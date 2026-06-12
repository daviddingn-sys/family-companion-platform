import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getMissingPublicSupabaseEnvKeys } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FamilyRole = "owner" | "admin" | "member" | "viewer";

export async function getRouteUser(): Promise<User | NextResponse> {
  const missingEnv = getMissingPublicSupabaseEnvKeys();
  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        error: "Supabase 尚未配置。",
        status: "missing_required_env",
        missingRequiredEnv: missingEnv,
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  return user;
}

export async function ensureProfile(user: User) {
  const admin = createSupabaseAdminClient();
  const profile = {
    id: user.id,
    display_name:
      user.user_metadata?.display_name ??
      user.phone ??
      "家庭成员",
    phone: user.phone ?? user.user_metadata?.phone ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

export async function ensureRouteProfile(user: User) {
  try {
    await ensureProfile(user);
    return null;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "用户资料初始化失败" },
      { status: 500 },
    );
  }
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
  let membership: Awaited<ReturnType<typeof getFamilyMembership>>;
  try {
    membership = await getFamilyMembership(familyId, userId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "家庭权限校验失败" },
      { status: 500 },
    );
  }

  if (!membership) {
    return NextResponse.json({ error: "没有访问该家庭的权限。" }, { status: 403 });
  }

  return membership;
}

export async function requireFamilyRole(
  familyId: string,
  userId: string,
  allowedRoles: FamilyRole[],
) {
  let membership: Awaited<ReturnType<typeof getFamilyMembership>>;
  try {
    membership = await getFamilyMembership(familyId, userId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "家庭权限校验失败" },
      { status: 500 },
    );
  }

  if (!membership || !allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "当前角色没有执行该操作的权限。" }, { status: 403 });
  }

  return membership;
}

export async function getElderInFamily(familyId: string, elderId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("elders")
    .select("id,name")
    .eq("family_id", familyId)
    .eq("id", elderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string; name: string } | null;
}

export async function requireElderInFamily(familyId: string, elderId: string) {
  let elder: Awaited<ReturnType<typeof getElderInFamily>>;
  try {
    elder = await getElderInFamily(familyId, elderId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "老人档案校验失败" },
      { status: 500 },
    );
  }

  if (!elder) {
    return NextResponse.json({ error: "老人档案不存在" }, { status: 404 });
  }

  return elder;
}
