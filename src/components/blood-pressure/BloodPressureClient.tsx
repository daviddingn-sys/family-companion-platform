"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BloodPressureRecord = {
  id: string;
  measured_at: string;
  period: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  status: string;
  source: string;
  note: string | null;
};

type Summary = {
  totalCount: number;
  confirmedCount: number;
  pendingCount: number;
  highCount: number;
  lowCount: number;
  systolicAvg: number | null;
  diastolicAvg: number | null;
  pulseAvg: number | null;
};

const periodLabels: Record<string, string> = {
  morning: "早",
  noon: "中",
  evening: "晚",
  night: "夜",
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultMeasuredAt() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "noon";
  if (hour < 21) return "evening";
  return "night";
}

export function BloodPressureClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<BloodPressureRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    measuredAt: defaultMeasuredAt(),
    period: defaultPeriod(),
    systolic: "",
    diastolic: "",
    pulse: "",
    note: "",
  });

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/blood-pressure`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    fetch(`${endpoint}?month=${month}`)
      .then((response) => response.json())
      .then((result) => {
        setRecords(result.records ?? []);
        setSummary(result.summary ?? null);
      })
      .finally(() => setLoading(false));
  }, [endpoint, month]);

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
      body: JSON.stringify({
        measuredAt: new Date(form.measuredAt).toISOString(),
        period: form.period,
        systolic: form.systolic,
        diastolic: form.diastolic,
        pulse: form.pulse,
        note: form.note,
        source: "web",
        status: "confirmed",
      }),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(result.error ?? "保存失败");
      return;
    }

    setForm({
      measuredAt: defaultMeasuredAt(),
      period: defaultPeriod(),
      systolic: "",
      diastolic: "",
      pulse: "",
      note: "",
    });
    load();
  }

  async function remove(recordId: string) {
    setError("");
    const response = await fetch(`${endpoint}/${recordId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "删除失败");
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{elderName}的血压记录</h1>
          <p className="text-sm text-muted-foreground">当前模块已按家庭和老人档案隔离数据。</p>
        </div>
        <Input
          className="w-36"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">确认记录</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary?.confirmedCount ?? 0}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">平均血压</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.systolicAvg ?? "-"} / {summary?.diastolicAvg ?? "-"}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">平均脉搏</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary?.pulseAvg ?? "-"}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">异常次数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.highCount ?? 0) + (summary?.lowCount ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            新增血压记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6" onSubmit={submit}>
            <div className="space-y-2 md:col-span-2">
              <Label>测量时间</Label>
              <Input
                type="datetime-local"
                value={form.measuredAt}
                onChange={(event) => setForm({ ...form, measuredAt: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>时段</Label>
              <Select value={form.period} onValueChange={(period) => setForm({ ...form, period })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">早</SelectItem>
                  <SelectItem value="noon">中</SelectItem>
                  <SelectItem value="evening">晚</SelectItem>
                  <SelectItem value="night">夜</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>高压</Label>
              <Input
                type="number"
                value={form.systolic}
                onChange={(event) => setForm({ ...form, systolic: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>低压</Label>
              <Input
                type="number"
                value={form.diastolic}
                onChange={(event) => setForm({ ...form, diastolic: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>脉搏</Label>
              <Input
                type="number"
                value={form.pulse}
                onChange={(event) => setForm({ ...form, pulse: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-6">
              <Label>备注</Label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </div>
            {error && <p className="text-sm text-destructive md:col-span-6">{error}</p>}
            <Button className="md:col-span-6" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存记录"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            记录列表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">本月暂无血压记录。</p>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-medium">
                    {record.systolic}/{record.diastolic} mmHg · 脉搏 {record.pulse}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(record.measured_at).toLocaleString("zh-CN")} · {periodLabels[record.period] ?? record.period} · {record.source}
                  </p>
                  {record.note && <p className="mt-1 text-sm">{record.note}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => remove(record.id)}>
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
