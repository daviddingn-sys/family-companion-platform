import { EldersClient } from "@/components/elder/EldersClient";

export default async function EldersPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  return <EldersClient familyId={familyId} />;
}
