"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestJson } from "@/lib/client-http";

type Member = {
  id: string;
  role: string;
  relationship: string | null;
  status: string;
  invited_email: string | null;
  invited_phone: string | null;
  profiles: { display_name: string | null; phone: string | null } | null;
};

type MembersResponse = {
  members: Member[];
};

const roleLabels: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  viewer: "只读",
};

const statusLabels: Record<string, string> = {
  active: "已加入",
  invited: "待接受",
  removed: "已移除",
};

export function MembersClient({
  familyId,
  canManage,
  currentRole,
}: {
  familyId: string;
  canManage: boolean;
  currentRole: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManageAdmins = currentRole === "owner";

  const load = useCallback(() => {
    async function run() {
      const result = await requestJson<MembersResponse>(`/api/families/${familyId}/members`);
      if (result.ok) {
        setLoadError("");
        setMembers(result.data.members ?? []);
      } else {
        setLoadError(result.error);
      }
      setLoading(false);
    }

    run();
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const result = await requestJson(`/api/families/${familyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, relationship, role }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmail("");
    setPhone("");
    setRelationship("");
    setRole("member");
    load();
  }

  async function updateMember(memberId: string, payload: Record<string, string>) {
    setActionError("");
    const result = await requestJson(`/api/families/${familyId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    load();
  }

  async function removeMember(memberId: string) {
    setActionError("");
    const result = await requestJson(`/api/families/${familyId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">家庭成员</h1>
        <p className="text-sm text-muted-foreground">支持按邮箱或手机号创建邀请，被邀请人登录后可在邀请页面接受。</p>
      </div>
      {canManage ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>邀请成员</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={invite}>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="可选" />
            </div>
            <div className="space-y-2">
              <Label>关系</Label>
              <Input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="子女/配偶" />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canManageAdmins && <SelectItem value="admin">管理员</SelectItem>}
                  <SelectItem value="member">成员</SelectItem>
                  <SelectItem value="viewer">只读</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="md:col-span-4 text-sm text-destructive">{error}</p>}
            <Button className="md:col-span-4" type="submit" disabled={saving}>
              {saving ? "添加中..." : "添加邀请"}
            </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">只有家庭所有者和管理员可以邀请或调整成员。</p>
          </CardContent>
        </Card>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      <div className="grid gap-3">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无家庭成员。</p>
        ) : members.map((member) => (
          <Card key={member.id} className="rounded-lg">
            <CardContent className="grid gap-3 py-4 md:grid-cols-[1fr_180px_auto] md:items-center">
              <div>
                <p className="font-medium">
                  {member.profiles?.display_name ?? member.invited_email ?? member.invited_phone ?? "未命名成员"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.relationship || "未填写关系"} · {roleLabels[member.role] ?? member.role} · {statusLabels[member.status] ?? member.status}
                </p>
              </div>
              {!canManage || member.role === "owner" || (!canManageAdmins && member.role === "admin") ? (
                <p className="text-sm text-muted-foreground">{roleLabels[member.role] ?? member.role}</p>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(nextRole) => updateMember(member.id, { role: nextRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canManageAdmins && <SelectItem value="admin">管理员</SelectItem>}
                    <SelectItem value="member">成员</SelectItem>
                    <SelectItem value="viewer">只读</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage || member.role === "owner" || (!canManageAdmins && member.role === "admin")}
                onClick={() => removeMember(member.id)}
              >
                移除
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
