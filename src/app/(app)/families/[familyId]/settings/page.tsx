import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteFamilyButton } from "@/components/family/DeleteFamilyButton";
import { FamilyForm } from "@/components/family/FamilyForm";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

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
  const family = requireSupabaseRow(
    await admin.from("families").select("id,name").eq("id", familyId).single(),
  );

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/families/${familyId}`}>返回家庭</Link>
        </Button>
        {(membership.role === "owner" || membership.role === "admin") && (
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/audit`}>家庭审计</Link>
          </Button>
        )}
      </div>
      <Card className="rounded-lg">
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
      {membership.role === "owner" && (
        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">危险操作</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteFamilyButton familyId={family.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
