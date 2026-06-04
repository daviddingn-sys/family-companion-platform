import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="text-sm text-muted-foreground">家庭、老人档案和健康数据的集中入口。</p>
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
      <div className="grid gap-3 md:grid-cols-5">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">近 30 天血压</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{bloodPressureCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">使用中用药</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeMedicationCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">未解决异常</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{openAbnormalCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">待处理提醒</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeReminderCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">健康报告</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{reportCount ?? 0}</CardContent>
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
                      {dueAt ? dueAt.toLocaleString("zh-CN") : "未设置时间"}
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
                    {severityLabels[event.severity] ?? event.severity} · {new Date(event.occurred_at).toLocaleString("zh-CN")}
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
