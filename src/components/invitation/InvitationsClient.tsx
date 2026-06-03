"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Invitation = {
  id: string;
  role: string;
  relationship: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  created_at: string;
  families: {
    id: string;
    name: string;
  } | null;
};

const roleLabels: Record<string, string> = {
  admin: "管理员",
  member: "成员",
  viewer: "只读",
};

export function InvitationsClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptedFamilyId, setAcceptedFamilyId] = useState("");
  const [acceptingId, setAcceptingId] = useState("");

  const load = useCallback(() => {
    fetch("/api/invitations")
      .then((response) => response.json())
      .then((result) => setInvitations(result.invitations ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(memberId: string) {
    setError("");
    setAcceptedFamilyId("");
    setAcceptingId(memberId);
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const result = await response.json();
    setAcceptingId("");

    if (!response.ok) {
      setError(result.error ?? "接受邀请失败");
      return;
    }

    setAcceptedFamilyId(result.member?.family_id ?? "");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">家庭邀请</h1>
        <p className="text-sm text-muted-foreground">这里显示与当前账号邮箱或手机号匹配的待接受邀请。</p>
      </div>

      {acceptedFamilyId && (
        <Card className="rounded-lg border-primary/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm">已加入家庭。</p>
            <Button asChild size="sm">
              <Link href={`/families/${acceptedFamilyId}`}>进入家庭</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="size-4" />
            待处理邀请
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无待处理邀请。</p>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-medium">{invitation.families?.name ?? "未命名家庭"}</p>
                  <p className="text-sm text-muted-foreground">
                    {invitation.relationship || "未填写关系"} · {roleLabels[invitation.role] ?? invitation.role} · {new Date(invitation.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invitation.invited_email || invitation.invited_phone}
                  </p>
                </div>
                <Button size="sm" onClick={() => accept(invitation.id)} disabled={acceptingId === invitation.id}>
                  {acceptingId === invitation.id ? "处理中..." : "接受邀请"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
