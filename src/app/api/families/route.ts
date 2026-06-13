import { NextRequest, NextResponse } from "next/server";
import { familySchema } from "@/lib/validators/family";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";

const MAX_FAMILIES = 100;

type FamilyRow = {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string | null;
};

type FamilyMembershipRow = {
  role: string;
  status: string;
  families: FamilyRow | FamilyRow[] | null;
};

type FamilyMemberSummaryRow = {
  family_id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

function getFamilyFromMembership(item: FamilyMembershipRow): FamilyRow | null {
  return Array.isArray(item.families) ? (item.families[0] ?? null) : item.families;
}

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_members")
    .select("role,status,families(id,name,owner_user_id,created_at,updated_at)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(MAX_FAMILIES);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const memberships = ((data ?? []) as FamilyMembershipRow[])
    .map((item) => ({
      ...item,
      families: getFamilyFromMembership(item),
    }))
    .filter((item): item is FamilyMembershipRow & { families: FamilyRow } => Boolean(item.families));

  const familyIds = memberships.map((item) => item.families.id);
  if (familyIds.length === 0) {
    return NextResponse.json({ families: [] });
  }

  const { data: familyMembers, error: familyMembersError } = await admin
    .from("elders")
    .select("family_id,name,created_at,updated_at")
    .in("family_id", familyIds)
    .order("updated_at", { ascending: false });

  if (familyMembersError) {
    return NextResponse.json({ error: familyMembersError.message }, { status: 500 });
  }

  const memberCounts = new Map<string, number>();
  const latestMemberByFamily = new Map<string, FamilyMemberSummaryRow>();
  for (const member of (familyMembers ?? []) as FamilyMemberSummaryRow[]) {
    memberCounts.set(member.family_id, (memberCounts.get(member.family_id) ?? 0) + 1);
    const current = latestMemberByFamily.get(member.family_id);
    const currentTime = current?.updated_at ?? current?.created_at ?? "";
    const memberTime = member.updated_at ?? member.created_at ?? "";
    if (!current || memberTime > currentTime) {
      latestMemberByFamily.set(member.family_id, member);
    }
  }

  return NextResponse.json({
    families: memberships.map((item) => ({
      ...item,
      familyMemberCount: memberCounts.get(item.families.id) ?? 0,
      latestMemberUpdate: latestMemberByFamily.get(item.families.id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;
  const body = await request.json().catch(() => null);
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({
      name: parsed.data.name,
      owner_user_id: user.id,
    })
    .select("id,name,owner_user_id,created_at,updated_at")
    .single();

  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message ?? "创建家庭失败" }, { status: 500 });
  }

  const { error: memberError } = await admin.from("family_members").insert({
    family_id: family.id,
    user_id: user.id,
    role: "owner",
    relationship: "创建者",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    await admin.from("families").delete().eq("id", family.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ family }, { status: 201 });
}
