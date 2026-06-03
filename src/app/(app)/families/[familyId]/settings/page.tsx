import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyForm } from "@/components/family/FamilyForm";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function FamilySettingsPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const admin = createSupabaseAdminClient();
  const { data: family } = await admin.from("families").select("id,name").eq("id", familyId).single();
  if (!family) notFound();

  return (
    <Card className="max-w-xl rounded-lg">
      <CardHeader>
        <CardTitle>家庭设置</CardTitle>
      </CardHeader>
      <CardContent>
        {membership.role === "owner" || membership.role === "admin" ? (
          <FamilyForm familyId={family.id} initialName={family.name} />
        ) : (
          <p className="text-sm text-muted-foreground">只有家庭所有者和管理员可以修改家庭设置。</p>
        )}
      </CardContent>
    </Card>
  );
}
