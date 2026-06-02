import { notFound } from "next/navigation";
import { CompanionClient } from "@/components/companion/CompanionClient";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ElderCompanionPage({
  params,
}: {
  params: Promise<{ familyId: string; elderId: string }>;
}) {
  const { familyId, elderId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const admin = createSupabaseAdminClient();
  const { data: elder } = await admin
    .from("elders")
    .select("id,name")
    .eq("family_id", familyId)
    .eq("id", elderId)
    .single();

  if (!elder) notFound();

  return <CompanionClient familyId={familyId} elderId={elderId} elderName={elder.name} />;
}
