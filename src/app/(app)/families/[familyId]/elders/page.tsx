import { notFound } from "next/navigation";
import { EldersClient } from "@/components/elder/EldersClient";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";

export default async function EldersPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  return <EldersClient familyId={familyId} />;
}
