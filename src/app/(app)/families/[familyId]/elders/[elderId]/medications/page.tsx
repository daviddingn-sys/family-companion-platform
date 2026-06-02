import { notFound } from "next/navigation";
import { MedicationsClient } from "@/components/medication/MedicationsClient";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ElderMedicationsPage({
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

  return <MedicationsClient familyId={familyId} elderId={elderId} elderName={elder.name} />;
}
