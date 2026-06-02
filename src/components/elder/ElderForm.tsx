"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ElderFormData = {
  id?: string;
  name?: string;
  gender?: string;
  birth_date?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  medical_notes?: string | null;
};

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
    gender: elder?.gender ?? "unknown",
    birthDate: elder?.birth_date ?? "",
    phone: elder?.phone ?? "",
    emergencyContactName: elder?.emergency_contact_name ?? "",
    emergencyContactPhone: elder?.emergency_contact_phone ?? "",
    address: elder?.address ?? "",
    medicalNotes: elder?.medical_notes ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(
      elder?.id
        ? `/api/families/${familyId}/elders/${elder.id}`
        : `/api/families/${familyId}/elders`,
      {
        method: elder?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "保存失败");
      return;
    }

    router.push(`/families/${familyId}/elders/${result.elder.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl rounded-lg">
      <CardHeader>
        <CardTitle>{elder?.id ? "编辑老人档案" : "新增老人档案"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>性别</Label>
            <Select value={form.gender} onValueChange={(gender) => setForm({ ...form, gender })}>
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
              onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>手机号</Label>
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>紧急联系人</Label>
            <Input
              value={form.emergencyContactName}
              onChange={(event) => setForm({ ...form, emergencyContactName: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>紧急联系人电话</Label>
            <Input
              value={form.emergencyContactPhone}
              onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>住址</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>健康备注</Label>
            <Textarea
              value={form.medicalNotes}
              onChange={(event) => setForm({ ...form, medicalNotes: event.target.value })}
              placeholder="慢病、过敏、就医偏好等"
            />
          </div>
          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
          <Button className="md:col-span-2" type="submit" disabled={loading}>
            {loading ? "保存中..." : "保存档案"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
