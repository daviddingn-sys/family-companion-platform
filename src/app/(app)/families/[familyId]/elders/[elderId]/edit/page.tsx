import { notFound } from "next/navigation";
import { ElderForm } from "@/components/elder/ElderForm";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

export default async function EditElderPage({
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
      .select("*")
      .eq("family_id", familyId)
      .eq("id", elderId)
      .single(),
  );

  return <ElderForm familyId={familyId} elder={elder} />;
}
