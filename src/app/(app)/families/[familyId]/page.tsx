import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const admin = createSupabaseAdminClient();
  const [{ data: family }, { count: memberCount }, { count: elderCount }] = await Promise.all([
    admin.from("families").select("id,name,created_at").eq("id", familyId).single(),
    admin.from("family_members").select("*", { count: "exact", head: true }).eq("family_id", familyId).neq("status", "removed"),
    admin.from("elders").select("*", { count: "exact", head: true }).eq("family_id", familyId),
  ]);

  if (!family) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{family.name}</h1>
          <p className="text-sm text-muted-foreground">你的角色：{membership.role}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/families/${familyId}/settings`}>家庭设置</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>家庭成员</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{memberCount ?? 0}</p>
            <Button asChild>
              <Link href={`/families/${familyId}/members`}>管理成员</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>老人档案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{elderCount ?? 0}</p>
            <Button asChild>
              <Link href={`/families/${familyId}/elders`}>管理档案</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
