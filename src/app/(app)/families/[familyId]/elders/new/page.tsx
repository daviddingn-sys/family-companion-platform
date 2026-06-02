import { ElderForm } from "@/components/elder/ElderForm";

export default async function NewElderPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  return <ElderForm familyId={familyId} />;
}
