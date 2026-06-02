import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteElderButton } from "@/components/elder/DeleteElderButton";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFamilyMembership } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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
  const { data: elder } = await admin
    .from("elders")
    .select("*")
    .eq("family_id", familyId)
    .eq("id", elderId)
    .single();

  if (!elder) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{elder.name}</h1>
          <p className="text-sm text-muted-foreground">老人档案详情</p>
        </div>
        <Button asChild>
          <Link href={`/families/${familyId}/elders/${elderId}/edit`}>编辑</Link>
        </Button>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>性别：{elder.gender}</p>
          <p>出生日期：{elder.birth_date || "-"}</p>
          <p>手机号：{elder.phone || "-"}</p>
          <p>住址：{elder.address || "-"}</p>
          <p>紧急联系人：{elder.emergency_contact_name || "-"}</p>
          <p>紧急联系人电话：{elder.emergency_contact_phone || "-"}</p>
          <p className="md:col-span-2">健康备注：{elder.medical_notes || "-"}</p>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-dashed">
        <CardContent className="py-5 text-sm text-muted-foreground">
          血压记录模块将在下一阶段接入，并关联到该老人档案。
        </CardContent>
      </Card>
      <Card className="rounded-lg border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">危险操作</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteElderButton familyId={familyId} elderId={elderId} />
        </CardContent>
      </Card>
    </div>
  );
}
