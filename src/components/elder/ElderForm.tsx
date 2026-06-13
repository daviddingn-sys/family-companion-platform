"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/client-http";

type ElderFormData = {
  id?: string;
  name?: string;
  relationship?: string | null;
  gender?: string;
  birth_date?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  medical_notes?: string | null;
};

type ElderResponse = {
  elder: {
    id: string;
  };
};

type SubmitAction = "view" | "continue" | "return";

export function ElderForm({
  familyId,
  elder,
}: {
  familyId: string;
  elder?: ElderFormData;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: elder?.name ?? "",
    relationship: elder?.relationship ?? "",
    gender: elder?.gender ?? "unknown",
    birthDate: elder?.birth_date ?? "",
    phone: elder?.phone ?? "",
    emergencyContactName: elder?.emergency_contact_name ?? "",
    emergencyContactPhone: elder?.emergency_contact_phone ?? "",
    address: elder?.address ?? "",
    medicalNotes: elder?.medical_notes ?? "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<SubmitAction | "">("");
  const isEditing = Boolean(elder?.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = (submitter?.value as SubmitAction | undefined) ?? "view";
    setLoadingAction(action);
    setError("");
    setMessage("");

    const endpoint =
      isEditing && elder?.id
        ? `/api/families/${familyId}/elders/${elder.id}`
        : `/api/families/${familyId}/elders`;

    const result = await requestJson<ElderResponse>(
      endpoint,
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    setLoadingAction("");

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (!isEditing && action === "continue") {
      setForm({
        name: "",
        relationship: "",
        gender: "unknown",
        birthDate: "",
        phone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        address: "",
        medicalNotes: "",
      });
      setMessage("已保存，可以继续新增下一位家庭成员。");
      router.refresh();
      return;
    }

    if (action === "return") {
      router.push(`/families/${familyId}`);
      router.refresh();
      return;
    }

    router.push(`/families/${familyId}/elders/${result.data.elder.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl rounded-lg">
      <CardHeader>
        <CardTitle>{elder?.id ? "编辑家庭成员" : "新增家庭成员"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>称谓/关系</Label>
            <Input
              value={form.relationship}
              onChange={(event) => setForm((current) => ({ ...current, relationship: event.target.value }))}
              placeholder="本人/父亲/母亲/配偶/儿子"
            />
          </div>
          <div className="space-y-2">
            <Label>性别</Label>
            <Select value={form.gender} onValueChange={(gender) => setForm((current) => ({ ...current, gender }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">未填写</SelectItem>
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>出生日期</Label>
            <Input
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>手机号</Label>
            <Input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>紧急联系人</Label>
            <Input
              value={form.emergencyContactName}
              onChange={(event) => setForm((current) => ({ ...current, emergencyContactName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>紧急联系人电话</Label>
            <Input
              value={form.emergencyContactPhone}
              onChange={(event) => setForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>住址</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>健康备注</Label>
            <Textarea
              value={form.medicalNotes}
              onChange={(event) => setForm((current) => ({ ...current, medicalNotes: event.target.value }))}
              placeholder="慢病、过敏、就医偏好等"
            />
          </div>
          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
          {message && <p className="text-sm text-muted-foreground md:col-span-2">{message}</p>}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" name="action" value="view" disabled={Boolean(loadingAction)}>
              {loadingAction === "view" ? "保存中..." : "保存并查看档案"}
            </Button>
            {!isEditing && (
              <Button type="submit" name="action" value="continue" variant="outline" disabled={Boolean(loadingAction)}>
                {loadingAction === "continue" ? "保存中..." : "保存并继续新增"}
              </Button>
            )}
            <Button type="submit" name="action" value="return" variant="outline" disabled={Boolean(loadingAction)}>
              {loadingAction === "return" ? "保存中..." : "保存并返回家庭"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
