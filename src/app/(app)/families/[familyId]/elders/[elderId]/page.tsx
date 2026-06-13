import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteElderButton } from "@/components/elder/DeleteElderButton";
import { requireUser } from "@/lib/auth";
import { formatPlatformDateTime } from "@/lib/platform-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

const genderLabels: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未填写",
};

const periodLabels: Record<string, string> = {
  morning: "早",
  noon: "中",
  evening: "晚",
  night: "夜",
};

export default async function ElderPage({
  params,
}: {
  params: Promise<{ familyId: string; elderId: string }>;
}) {
  const { familyId, elderId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const admin = createSupabaseAdminClient();
  const elder = requireSupabaseRow(
    await admin
      .from("elders")
      .select("*")
      .eq("family_id", familyId)
      .eq("id", elderId)
      .single(),
  );
  const [
    activeMedicationsResult,
    latestBloodPressureResult,
    activeRemindersResult,
    openAbnormalEventsResult,
  ] = await Promise.all([
    admin
      .from("medications")
      .select("id,name,dosage,frequency,instructions,note,status")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("blood_pressure_records")
      .select("id,measured_at,period,systolic,diastolic,pulse,note")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .order("measured_at", { ascending: false })
      .limit(3),
    admin
      .from("reminders")
      .select("id,title,type,due_at,note,status")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .eq("status", "active")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5),
    admin
      .from("abnormal_events")
      .select("id,title,severity,occurred_at,status,description")
      .eq("family_id", familyId)
      .eq("elder_id", elderId)
      .neq("status", "resolved")
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  for (const result of [
    activeMedicationsResult,
    latestBloodPressureResult,
    activeRemindersResult,
    openAbnormalEventsResult,
  ]) {
    if (result.error) throw result.error;
  }

  const activeMedications = activeMedicationsResult.data ?? [];
  const latestBloodPressure = latestBloodPressureResult.data ?? [];
  const activeReminders = activeRemindersResult.data ?? [];
  const openAbnormalEvents = openAbnormalEventsResult.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{elder.name}</h1>
          <p className="text-sm text-muted-foreground">健康档案详情</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/elders/${elderId}/blood-pressure`}>血压记录</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/elders/${elderId}/medications`}>用药记录</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/elders/${elderId}/reminders`}>提醒事项</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/elders/${elderId}/abnormal-events`}>异常记录</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/elders/${elderId}/reports`}>健康报告</Link>
          </Button>
          <Button asChild>
            <Link href={`/families/${familyId}/elders/${elderId}/edit`}>编辑</Link>
          </Button>
        </div>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>称谓/关系：{elder.relationship || "-"}</p>
          <p>性别：{genderLabels[elder.gender] ?? elder.gender}</p>
          <p>出生日期：{elder.birth_date || "-"}</p>
          <p>手机号：{elder.phone || "-"}</p>
          <p>住址：{elder.address || "-"}</p>
          <p>紧急联系人：{elder.emergency_contact_name || "-"}</p>
          <p>紧急联系人电话：{elder.emergency_contact_phone || "-"}</p>
          <p className="md:col-span-2">健康备注：{elder.medical_notes || "-"}</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>当前用药</span>
              <Link className="text-sm font-normal text-primary" href={`/families/${familyId}/elders/${elderId}/medications`}>
                查看全部
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMedications.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无使用中的用药记录。</p>
            ) : activeMedications.map((medication) => (
              <div key={medication.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{medication.name}</p>
                <p className="text-muted-foreground">
                  {[medication.dosage, medication.frequency].filter(Boolean).join(" · ") || "未填写剂量和频次"}
                </p>
                {(medication.instructions || medication.note) && (
                  <p className="mt-1">{medication.instructions || medication.note}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>最近血压</span>
              <Link className="text-sm font-normal text-primary" href={`/families/${familyId}/elders/${elderId}/blood-pressure`}>
                查看全部
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestBloodPressure.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无血压记录。</p>
            ) : latestBloodPressure.map((record) => (
              <div key={record.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {periodLabels[record.period] ?? record.period}：{record.systolic}/{record.diastolic} 脉：{record.pulse}
                </p>
                <p className="text-muted-foreground">{formatPlatformDateTime(record.measured_at)}</p>
                {record.note && <p className="mt-1">{record.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>待处理提醒</span>
              <Link className="text-sm font-normal text-primary" href={`/families/${familyId}/elders/${elderId}/reminders`}>
                查看全部
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无待处理提醒。</p>
            ) : activeReminders.map((reminder) => (
              <div key={reminder.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{reminder.title}</p>
                <p className="text-muted-foreground">
                  {reminder.due_at ? formatPlatformDateTime(reminder.due_at) : "未设置时间"}
                </p>
                {reminder.note && <p className="mt-1">{reminder.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>未解决异常</span>
              <Link className="text-sm font-normal text-primary" href={`/families/${familyId}/elders/${elderId}/abnormal-events`}>
                查看全部
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openAbnormalEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无未解决异常。</p>
            ) : openAbnormalEvents.map((event) => (
              <div key={event.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground">
                  {event.severity} · {formatPlatformDateTime(event.occurred_at)}
                </p>
                {event.description && <p className="mt-1">{event.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {(membership.role === "owner" || membership.role === "admin") && (
        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">危险操作</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteElderButton familyId={familyId} elderId={elderId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
