import { MembersClient } from "@/components/family/MembersClient";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  return <MembersClient familyId={familyId} />;
}
