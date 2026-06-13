import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function MetricCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href}>
      <Card className="h-full rounded-lg transition-colors hover:border-primary hover:bg-accent/50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{value}</CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  const { data: memberships, error: membershipsError } = await admin
    .from("family_members")
    .select("role,families(id,name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsError) throw membershipsError;

  const familyIds = (memberships ?? [])
    .map((item) => {
      const family = Array.isArray(item.families) ? item.families[0] : item.families;
      return family?.id;
    })
    .filter(Boolean) as string[];

  const [
    collaborationMemberCountResult,
    familyMemberCountResult,
    activeReminderCountResult,
  ] = await Promise.all([
    familyIds.length
      ? admin.from("family_members").select("*", { count: "exact", head: true }).in("family_id", familyIds).neq("status", "removed")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("elders").select("*", { count: "exact", head: true }).in("family_id", familyIds)
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("reminders").select("*", { count: "exact", head: true }).in("family_id", familyIds).eq("status", "active")
      : Promise.resolve({ count: 0 }),
  ]);
  const dashboardResults = [
    collaborationMemberCountResult,
    familyMemberCountResult,
    activeReminderCountResult,
  ];

  for (const result of dashboardResults) {
    if ("error" in result && result.error) throw result.error;
  }

  const collaborationMemberCount = collaborationMemberCountResult.count ?? 0;
  const familyMemberCount = familyMemberCountResult.count ?? 0;
  const activeReminderCount = activeReminderCountResult.count ?? 0;
  const primaryFamilyId = familyIds[0];
  const familiesHref = "/families";
  const membersHref = primaryFamilyId ? `/families/${primaryFamilyId}/members` : familiesHref;
  const familyMembersHref = primaryFamilyId ? `/families/${primaryFamilyId}` : familiesHref;
  const remindersHref = primaryFamilyId ? `/families/${primaryFamilyId}` : familiesHref;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="text-sm text-muted-foreground">家庭级入口。具体健康数据进入家庭成员后查看。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard href={familiesHref} label="家庭数量" value={familyIds.length} />
        <MetricCard href={familyMembersHref} label="家庭成员数量" value={familyMemberCount ?? 0} />
        <MetricCard href={membersHref} label="协作成员数量" value={collaborationMemberCount ?? 0} />
        <MetricCard href={remindersHref} label="待处理提醒数量" value={activeReminderCount ?? 0} />
      </div>
    </div>
  );
}
