import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  viewer: "只读",
};

const genderLabels: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未填写",
};

function getAge(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

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
  const [familyResult, familyMembersResult] = await Promise.all([
    admin.from("families").select("id,name,created_at").eq("id", familyId).single(),
    admin
      .from("elders")
      .select("id,name,relationship,gender,birth_date,phone,medical_notes")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
  ]);

  const family = requireSupabaseRow(familyResult);
  if (familyMembersResult.error) throw familyMembersResult.error;

  const familyMembers = familyMembersResult.data ?? [];
  const familyMemberIds = familyMembers.map((member) => member.id);
  const [latestBloodPressureResult, openAbnormalCountsResult] = familyMemberIds.length
    ? await Promise.all([
        admin
          .from("blood_pressure_records")
          .select("elder_id,measured_at,systolic,diastolic,pulse")
          .eq("family_id", familyId)
          .in("elder_id", familyMemberIds)
          .order("measured_at", { ascending: false }),
        admin
          .from("abnormal_events")
          .select("elder_id")
          .eq("family_id", familyId)
          .in("elder_id", familyMemberIds)
          .neq("status", "resolved"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (latestBloodPressureResult.error) throw latestBloodPressureResult.error;
  if (openAbnormalCountsResult.error) throw openAbnormalCountsResult.error;

  const latestBloodPressureByMember = new Map<string, {
    systolic: number;
    diastolic: number;
    pulse: number;
  }>();
  for (const record of latestBloodPressureResult.data ?? []) {
    if (!latestBloodPressureByMember.has(record.elder_id)) {
      latestBloodPressureByMember.set(record.elder_id, record);
    }
  }

  const abnormalCountByMember = new Map<string, number>();
  for (const event of openAbnormalCountsResult.data ?? []) {
    abnormalCountByMember.set(event.elder_id, (abnormalCountByMember.get(event.elder_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{family.name}</h1>
          <p className="text-sm text-muted-foreground">你的角色：{roleLabels[membership.role] ?? membership.role}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {(membership.role === "owner" || membership.role === "admin") && (
            <Button asChild variant="outline">
              <Link href={`/families/${familyId}/audit`}>家庭审计</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/families/${familyId}/settings`}>家庭设置</Link>
          </Button>
        </div>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>家庭成员</span>
            <Button asChild size="sm">
              <Link href={`/families/${familyId}/elders/new`}>新增家庭成员</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {familyMembers.length === 0 ? (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-sm text-muted-foreground">还没有家庭成员。先添加一个成员，再记录对应的健康数据。</p>
              <Button asChild>
                <Link href={`/families/${familyId}/elders/new`}>新增家庭成员</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {familyMembers.map((member) => {
                const age = getAge(member.birth_date);
                const latestBloodPressure = latestBloodPressureByMember.get(member.id);
                const abnormalCount = abnormalCountByMember.get(member.id) ?? 0;
                const bloodPressureLabel = latestBloodPressure
                  ? `${latestBloodPressure.systolic}/${latestBloodPressure.diastolic} 脉：${latestBloodPressure.pulse}`
                  : "暂无记录";

                return (
                  <div key={member.id} className="rounded-md border p-4">
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold">{member.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        关系：{member.relationship || "未填写"} · 年龄：{age == null ? "未填写" : `${age}岁`} · 性别：{genderLabels[member.gender] ?? member.gender}
                      </p>
                      {member.phone && <p className="text-sm text-muted-foreground">联系方式：{member.phone}</p>}
                    </div>
                    <div className="mb-4 grid gap-2 text-sm">
                      <p>最近血压：{bloodPressureLabel}</p>
                      <p>未解决异常：{abnormalCount}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={`/families/${familyId}/elders/${member.id}`}>查看成员档案</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/families/${familyId}/elders/${member.id}/blood-pressure`}>健康数据</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/families/${familyId}/elders/${member.id}/medications`}>用药记录</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/families/${familyId}/elders/${member.id}/abnormal-events`}>异常记录</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/families/${familyId}/elders/${member.id}/edit`}>编辑成员</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
