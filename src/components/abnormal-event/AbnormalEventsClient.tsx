"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AbnormalEvent = {
  id: string;
  title: string;
  event_type: string;
  severity: string;
  occurred_at: string;
  status: string;
  description: string | null;
  related_blood_pressure_record_id: string | null;
};

const eventTypeLabels: Record<string, string> = {
  blood_pressure: "血压异常",
  medication: "用药异常",
  fall: "跌倒",
  symptom: "症状",
  other: "其他",
};

const severityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急",
};

const statusLabels: Record<string, string> = {
  open: "待处理",
  monitoring: "观察中",
  resolved: "已解决",
};

function nowLocalInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowLocalInputValue();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function AbnormalEventsClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const [events, setEvents] = useState<AbnormalEvent[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventType: "blood_pressure",
    severity: "medium",
    occurredAt: nowLocalInputValue(),
    status: "open",
    description: "",
    relatedBloodPressureRecordId: "",
  });

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/abnormal-events`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then((result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        setLoadError("");
        setEvents(result.abnormalEvents ?? []);
      })
      .catch((loadError: Error) => {
        setLoadError(loadError.message || "异常记录加载失败");
      })
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
      title: "",
      eventType: "blood_pressure",
      severity: "medium",
      occurredAt: nowLocalInputValue(),
      status: "open",
      description: "",
      relatedBloodPressureRecordId: "",
    });
    load();
  }

  async function updateStatus(abnormalEvent: AbnormalEvent, status: string) {
    setError("");
    const response = await fetch(`${endpoint}/${abnormalEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: abnormalEvent.title,
        eventType: abnormalEvent.event_type,
        severity: abnormalEvent.severity,
        occurredAt: toLocalInputValue(abnormalEvent.occurred_at),
        status,
        description: abnormalEvent.description ?? "",
        relatedBloodPressureRecordId: abnormalEvent.related_blood_pressure_record_id ?? "",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "更新失败");
      return;
    }
    load();
  }

  async function remove(eventId: string) {
    if (!window.confirm("确定删除这条异常记录吗？")) {
      return;
    }

    setError("");
    const response = await fetch(`${endpoint}/${eventId}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold">{elderName}的异常记录</h1>
        <p className="text-sm text-muted-foreground">记录血压、用药、跌倒、症状等需要家庭关注的事件。</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            新增异常
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
            <div className="space-y-2 md:col-span-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={form.eventType} onValueChange={(eventType) => setForm((current) => ({ ...current, eventType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_pressure">血压异常</SelectItem>
                  <SelectItem value="medication">用药异常</SelectItem>
                  <SelectItem value="fall">跌倒</SelectItem>
                  <SelectItem value="symptom">症状</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>严重程度</Label>
              <Select value={form.severity} onValueChange={(severity) => setForm((current) => ({ ...current, severity }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="critical">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>发生时间</Label>
              <Input
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>处理状态</Label>
              <Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">待处理</SelectItem>
                  <SelectItem value="monitoring">观察中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>关联血压记录 ID</Label>
              <Input
                value={form.relatedBloodPressureRecordId}
                onChange={(event) => setForm((current) => ({ ...current, relatedBloodPressureRecordId: event.target.value }))}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>说明</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive md:col-span-4">{error}</p>}
            <Button className="md:col-span-4" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存异常记录"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            异常列表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无异常记录。</p>
          ) : (
            events.map((abnormalEvent) => (
              <div key={abnormalEvent.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_150px_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{abnormalEvent.title}</p>
                    <Badge variant={abnormalEvent.severity === "critical" || abnormalEvent.severity === "high" ? "destructive" : "secondary"}>
                      {severityLabels[abnormalEvent.severity]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {eventTypeLabels[abnormalEvent.event_type]} · {statusLabels[abnormalEvent.status]} · {new Date(abnormalEvent.occurred_at).toLocaleString("zh-CN")}
                  </p>
                  {abnormalEvent.description && <p className="mt-1 text-sm text-muted-foreground">{abnormalEvent.description}</p>}
                  {abnormalEvent.related_blood_pressure_record_id && (
                    <p className="mt-1 text-xs text-muted-foreground">关联血压记录：{abnormalEvent.related_blood_pressure_record_id}</p>
                  )}
                </div>
                <Select value={abnormalEvent.status} onValueChange={(status) => updateStatus(abnormalEvent, status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">待处理</SelectItem>
                    <SelectItem value="monitoring">观察中</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => remove(abnormalEvent.id)}>
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
