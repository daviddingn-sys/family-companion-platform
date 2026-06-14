import { NextRequest, NextResponse } from "next/server";
import { getMiniprogramUser } from "@/lib/miniprogram-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FamilyRow = {
  id: string;
  name: string;
  updated_at: string | null;
};

type MembershipRow = {
  role: string;
  families: FamilyRow | FamilyRow[] | null;
};

function normalizeFamily(row: MembershipRow) {
  return Array.isArray(row.families) ? (row.families[0] ?? null) : row.families;
}

export async function GET(request: NextRequest) {
  const miniUser = await getMiniprogramUser(request);
  if (miniUser instanceof NextResponse) return miniUser;

  const admin = createSupabaseAdminClient();
  const { data: memberships, error } = await admin
    .from("family_members")
    .select("role,families(id,name,updated_at)")
    .eq("user_id", miniUser.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const families = ((memberships ?? []) as MembershipRow[])
    .map((membership) => ({
      role: membership.role,
      family: normalizeFamily(membership),
    }))
    .filter((item): item is { role: string; family: FamilyRow } => Boolean(item.family));

  const familyIds = families.map((item) => item.family.id);
  const { data: members, error: membersError } = familyIds.length
    ? await admin
        .from("elders")
        .select("id,family_id,name,relationship,gender,birth_date,phone,updated_at")
        .in("family_id", familyIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  return NextResponse.json({
    families: families.map((item) => ({
      id: item.family.id,
      name: item.family.name,
      role: item.role,
      updatedAt: item.family.updated_at,
      members: (members ?? [])
        .filter((member) => member.family_id === item.family.id)
        .map((member) => ({
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          gender: member.gender,
          birthDate: member.birth_date,
          phone: member.phone,
          updatedAt: member.updated_at,
        })),
    })),
  });
}
