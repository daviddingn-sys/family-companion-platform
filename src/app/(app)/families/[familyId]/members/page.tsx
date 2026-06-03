import { notFound } from "next/navigation";
import { MembersClient } from "@/components/family/MembersClient";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  return (
    <MembersClient
      familyId={familyId}
      canManage={membership.role === "owner" || membership.role === "admin"}
      currentRole={membership.role}
    />
  );
}
