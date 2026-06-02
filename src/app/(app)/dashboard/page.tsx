import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  const { data: memberships } = await admin
    .from("family_members")
    .select("role,families(id,name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const familyIds = (memberships ?? [])
    .map((item) => {
      const family = Array.isArray(item.families) ? item.families[0] : item.families;
      return family?.id;
    })
    .filter(Boolean) as string[];

  const [{ count: memberCount }, { count: elderCount }] = await Promise.all([
    familyIds.length
      ? admin.from("family_members").select("*", { count: "exact", head: true }).in("family_id", familyIds).neq("status", "removed")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("elders").select("*", { count: "exact", head: true }).in("family_id", familyIds)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="text-sm text-muted-foreground">先建立家庭、成员和老人档案，后续健康数据都会挂在这些基础对象下。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">家庭数量</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{familyIds.length}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">成员数量</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{memberCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">老人档案</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{elderCount ?? 0}</CardContent>
        </Card>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>快捷入口</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/families">管理家庭</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/families/new">创建家庭</Link>
          </Button>
          {familyIds[0] && (
            <Button asChild variant="outline">
              <Link href={`/families/${familyIds[0]}/elders`}>老人档案</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
