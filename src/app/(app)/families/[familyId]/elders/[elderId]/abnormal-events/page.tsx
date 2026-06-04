import { notFound } from "next/navigation";
import { AbnormalEventsClient } from "@/components/abnormal-event/AbnormalEventsClient";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

export default async function ElderAbnormalEventsPage({
  params,
}: {
  params: Promise<{ familyId: string; elderId: string }>;
}) {
  const { familyId, elderId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const admin = createSupabaseAdminClient();
  const elder = requireSupabaseRow(
    await admin
      .from("elders")
      .select("id,name")
      .eq("family_id", familyId)
      .eq("id", elderId)
      .single(),
  );

  return <AbnormalEventsClient familyId={familyId} elderId={elderId} elderName={elder.name} />;
}
