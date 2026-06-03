"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  note: string | null;
};

const statusLabels: Record<string, string> = {
  active: "使用中",
  paused: "暂停",
  stopped: "已停用",
};

export function MedicationsClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    instructions: "",
    startDate: "",
    endDate: "",
    status: "active",
    note: "",
  });

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/medications`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then((result) => setMedications(result.medications ?? []))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(result.error ?? "保存失败");
      return;
    }

    setForm({
      name: "",
      dosage: "",
      frequency: "",
      instructions: "",
      startDate: "",
      endDate: "",
      status: "active",
      note: "",
    });
    load();
  }

  async function updateStatus(medication: Medication, status: string) {
    setError("");
    const response = await fetch(`${endpoint}/${medication.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: medication.name,
        dosage: medication.dosage ?? "",
        frequency: medication.frequency ?? "",
        instructions: medication.instructions ?? "",
        startDate: medication.start_date ?? "",
        endDate: medication.end_date ?? "",
        status,
        note: medication.note ?? "",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "更新失败");
      return;
    }
    load();
  }

  async function remove(medicationId: string) {
    setError("");
    const response = await fetch(`${endpoint}/${medicationId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "删除失败");
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{elderName}的用药记录</h1>
        <p className="text-sm text-muted-foreground">记录药品、剂量、频次和当前状态；提醒调度下一阶段接入。</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            新增用药
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
            <div className="space-y-2 md:col-span-2">
              <Label>药品名称</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>剂量</Label>
              <Input
                value={form.dosage}
                onChange={(event) => setForm((current) => ({ ...current, dosage: event.target.value }))}
                placeholder="如 5mg"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">使用中</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                  <SelectItem value="stopped">已停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>频次</Label>
              <Input
                value={form.frequency}
                onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
                placeholder="如 每日一次，早饭后"
              />
            </div>
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>用药说明</Label>
              <Textarea
                value={form.instructions}
                onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>备注</Label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive md:col-span-4">{error}</p>}
            <Button className="md:col-span-4" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存用药"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="size-4" />
            用药列表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无用药记录。</p>
          ) : (
            medications.map((medication) => (
              <div
                key={medication.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px_auto] md:items-center"
              >
                <div>
                  <p className="font-medium">{medication.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {medication.dosage || "未填剂量"} · {medication.frequency || "未填频次"} · {statusLabels[medication.status]}
                  </p>
                  {medication.instructions && <p className="mt-1 text-sm">{medication.instructions}</p>}
                  {medication.note && <p className="mt-1 text-sm text-muted-foreground">{medication.note}</p>}
                </div>
                <Select
                  value={medication.status}
                  onValueChange={(status) => updateStatus(medication, status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">使用中</SelectItem>
                    <SelectItem value="paused">暂停</SelectItem>
                    <SelectItem value="stopped">已停用</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => remove(medication.id)}>
                  删除
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
