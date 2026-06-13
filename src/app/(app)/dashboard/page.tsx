import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatPlatformDateTime } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const severityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急",
};

const reminderTypeLabels: Record<string, string> = {
  medicine: "用药",
  measurement: "测量",
  appointment: "就医",
  custom: "其他",
};

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

  const since30Days = new Date();
  since30Days.setDate(since30Days.getDate() - 30);
  const now = new Date();

  const [
    memberCountResult,
    elderCountResult,
    bloodPressureCountResult,
    activeMedicationCountResult,
    openAbnormalCountResult,
    activeReminderCountResult,
    reportCountResult,
    eldersResult,
    upcomingRemindersResult,
    recentAbnormalEventsResult,
  ] = await Promise.all([
    familyIds.length
      ? admin.from("family_members").select("*", { count: "exact", head: true }).in("family_id", familyIds).neq("status", "removed")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("elders").select("*", { count: "exact", head: true }).in("family_id", familyIds)
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("blood_pressure_records").select("*", { count: "exact", head: true }).in("family_id", familyIds).gte("measured_at", since30Days.toISOString())
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("medications").select("*", { count: "exact", head: true }).in("family_id", familyIds).eq("status", "active")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("abnormal_events").select("*", { count: "exact", head: true }).in("family_id", familyIds).neq("status", "resolved")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("reminders").select("*", { count: "exact", head: true }).in("family_id", familyIds).eq("status", "active")
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("health_reports").select("*", { count: "exact", head: true }).in("family_id", familyIds)
      : Promise.resolve({ count: 0 }),
    familyIds.length
      ? admin.from("elders").select("id,name,family_id").in("family_id", familyIds).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    familyIds.length
      ? admin
          .from("reminders")
          .select("id,title,type,due_at,family_id,elder_id")
          .in("family_id", familyIds)
          .eq("status", "active")
          .not("due_at", "is", null)
          .order("due_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    familyIds.length
      ? admin.from("abnormal_events").select("id,title,severity,occurred_at,family_id,elder_id").in("family_id", familyIds).order("occurred_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ]);
  const dashboardResults = [
    memberCountResult,
    elderCountResult,
    bloodPressureCountResult,
    activeMedicationCountResult,
    openAbnormalCountResult,
    activeReminderCountResult,
    reportCountResult,
    eldersResult,
    upcomingRemindersResult,
    recentAbnormalEventsResult,
  ];

  for (const result of dashboardResults) {
    if ("error" in result && result.error) throw result.error;
  }

  const memberCount = memberCountResult.count ?? 0;
  const elderCount = elderCountResult.count ?? 0;
  const bloodPressureCount = bloodPressureCountResult.count ?? 0;
  const activeMedicationCount = activeMedicationCountResult.count ?? 0;
  const openAbnormalCount = openAbnormalCountResult.count ?? 0;
  const activeReminderCount = activeReminderCountResult.count ?? 0;
  const reportCount = reportCountResult.count ?? 0;
  const elders = eldersResult.data ?? [];
  const upcomingReminders = upcomingRemindersResult.data ?? [];
  const recentAbnormalEvents = recentAbnormalEventsResult.data ?? [];
  const primaryFamilyId = familyIds[0];
  const primaryElder = elders[0];
  const familiesHref = "/families";
  const membersHref = primaryFamilyId ? `/families/${primaryFamilyId}/members` : familiesHref;
  const eldersHref = primaryFamilyId ? `/families/${primaryFamilyId}/elders` : familiesHref;
  const elderModuleHref = (module: "blood-pressure" | "medications" | "abnormal-events" | "reminders" | "reports") =>
    primaryElder ? `/families/${primaryElder.family_id}/elders/${primaryElder.id}/${module}` : eldersHref;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="text-sm text-muted-foreground">家庭、老人档案和健康数据的集中入口。</p>
        <p className="text-xs text-muted-foreground">家庭成员不包含老人档案，老人按档案单独统计。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard href={familiesHref} label="家庭数量" value={familyIds.length} />
        <MetricCard href={membersHref} label="成员数量" value={memberCount ?? 0} />
        <MetricCard href={eldersHref} label="老人档案" value={elderCount ?? 0} />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard href={elderModuleHref("blood-pressure")} label="近 30 天血压" value={bloodPressureCount ?? 0} />
        <MetricCard href={elderModuleHref("medications")} label="使用中用药" value={activeMedicationCount ?? 0} />
        <MetricCard href={elderModuleHref("abnormal-events")} label="未解决异常" value={openAbnormalCount ?? 0} />
        <MetricCard href={elderModuleHref("reminders")} label="待处理提醒" value={activeReminderCount ?? 0} />
        <MetricCard href={elderModuleHref("reports")} label="健康报告" value={reportCount ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>老人档案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(elders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无老人档案。</p>
            ) : (
              (elders ?? []).map((elder) => (
                <Link
                  key={elder.id}
                  className="block rounded-md border p-3 text-sm hover:bg-accent"
                  href={`/families/${elder.family_id}/elders/${elder.id}`}
                >
                  {elder.name}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>待处理提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(upcomingReminders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无已设置时间的待处理提醒。</p>
            ) : (
              (upcomingReminders ?? []).map((reminder) => {
                const dueAt = reminder.due_at ? new Date(reminder.due_at) : null;
                const timingLabel = dueAt && dueAt < now ? "已过期" : "待处理";

                return (
                  <Link
                    key={reminder.id}
                    className="block rounded-md border p-3 text-sm hover:bg-accent"
                    href={`/families/${reminder.family_id}/elders/${reminder.elder_id}/reminders`}
                  >
                    <span className="font-medium">{reminder.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      {reminderTypeLabels[reminder.type] ?? reminder.type} · {timingLabel} ·{" "}
                      {dueAt ? formatPlatformDateTime(dueAt) : "未设置时间"}
                    </span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>最近异常</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentAbnormalEvents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无异常记录。</p>
            ) : (
              (recentAbnormalEvents ?? []).map((event) => (
                <Link
                  key={event.id}
                  className="block rounded-md border p-3 text-sm hover:bg-accent"
                  href={`/families/${event.family_id}/elders/${event.elder_id}/abnormal-events`}
                >
                  <span className="font-medium">{event.title}</span>
                  <span className="ml-2 text-muted-foreground">
                    {severityLabels[event.severity] ?? event.severity} · {formatPlatformDateTime(event.occurred_at)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
