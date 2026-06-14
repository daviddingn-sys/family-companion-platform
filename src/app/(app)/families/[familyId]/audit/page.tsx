import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getFamilyMembership } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  viewer: "只读",
};

const requestTypeLabels: Record<string, string> = {
  export_all: "全部数据导出",
  delete_all: "全部数据删除",
};

const statusLabels: Record<string, string> = {
  submitted: "已提交",
  processing: "处理中",
  completed: "已完成",
  rejected: "已拒绝",
};

function formatTime(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

export default async function FamilyAuditPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await requireUser();
  const membership = await getFamilyMembership(familyId, user.id);
  if (!membership) notFound();

  const canAudit = membership.role === "owner" || membership.role === "admin";
  const admin = createSupabaseAdminClient();
  const family = requireSupabaseRow(
    await admin.from("families").select("id,name").eq("id", familyId).single(),
  );

  if (!canAudit) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={`/families/${familyId}`}>返回家庭</Link>
        </Button>
        <Card className="rounded-lg">
          <CardContent className="py-8 text-sm text-muted-foreground">
            当前角色为{roleLabels[membership.role] ?? membership.role}，不能查看家庭审计记录。
          </CardContent>
        </Card>
      </div>
    );
  }

  const [requestsResult, logsResult] = await Promise.all([
    admin
      .from("data_requests")
      .select("id,user_id,request_type,status,source,note,created_at,updated_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("operation_logs")
      .select("id,actor_user_id,action,resource_type,resource_id,source,created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (logsResult.error) throw logsResult.error;

  const requests = requestsResult.data ?? [];
  const logs = logsResult.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">家庭审计</h1>
          <p className="text-sm text-muted-foreground">{family.name} 的数据请求和关键操作记录。</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/families/${familyId}`}>返回家庭</Link>
        </Button>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">数据请求</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无家庭相关数据请求。</p>
          ) : (
            <div className="grid gap-2">
              {requests.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {requestTypeLabels[item.request_type] ?? item.request_type} · {statusLabels[item.status] ?? item.status}
                  </p>
                  <p className="text-muted-foreground">
                    {item.source} · {formatTime(item.created_at)}
                  </p>
                  {item.note && <p className="mt-1">{item.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">操作日志</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无家庭相关操作日志。</p>
          ) : (
            <div className="grid gap-2">
              {logs.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <span>
                    {item.action} · {item.resource_type}
                    {item.resource_id ? ` · ${item.resource_id.slice(0, 8)}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {item.source} · {formatTime(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
