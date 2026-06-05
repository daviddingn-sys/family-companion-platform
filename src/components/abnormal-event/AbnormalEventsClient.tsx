"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/client-http";
import { formatPlatformDateTime, formatPlatformLocalMinuteInput } from "@/lib/platform-time";

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

type AbnormalEventsResponse = {
  abnormalEvents: AbnormalEvent[];
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
  return formatPlatformLocalMinuteInput();
}

function toLocalInputValue(value: string) {
  return formatPlatformLocalMinuteInput(value) || nowLocalInputValue();
}

function emptyAbnormalEventForm() {
  return {
    title: "",
    eventType: "blood_pressure",
    severity: "medium",
    occurredAt: nowLocalInputValue(),
    status: "open",
    description: "",
    relatedBloodPressureRecordId: "",
  };
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
  const [editingEvent, setEditingEvent] = useState<AbnormalEvent | null>(null);
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [form, setForm] = useState(emptyAbnormalEventForm);
  const [editForm, setEditForm] = useState(emptyAbnormalEventForm);

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/abnormal-events`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    async function run() {
      const result = await requestJson<AbnormalEventsResponse>(endpoint);
      if (result.ok) {
        setLoadError("");
        setEvents(result.data.abnormalEvents ?? []);
      } else {
        setLoadError(result.error);
      }
      setLoading(false);
    }

    run();
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const result = await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setForm(emptyAbnormalEventForm());
    load();
  }

  function startEdit(abnormalEvent: AbnormalEvent) {
    setEditError("");
    setEditingEvent(abnormalEvent);
    setEditForm({
      title: abnormalEvent.title,
      eventType: abnormalEvent.event_type,
      severity: abnormalEvent.severity,
      occurredAt: toLocalInputValue(abnormalEvent.occurred_at),
      status: abnormalEvent.status,
      description: abnormalEvent.description ?? "",
      relatedBloodPressureRecordId: abnormalEvent.related_blood_pressure_record_id ?? "",
    });
  }

  async function updateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent) return;

    setEditError("");
    setUpdating(true);
    const result = await requestJson(`${endpoint}/${editingEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setUpdating(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditingEvent(null);
    load();
  }

  async function updateStatus(abnormalEvent: AbnormalEvent, status: string) {
    setError("");
    setStatusUpdatingId(abnormalEvent.id);
    const result = await requestJson(`${endpoint}/${abnormalEvent.id}`, {
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
    setStatusUpdatingId("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  async function remove(eventId: string) {
    if (!window.confirm("确定删除这条异常记录吗？")) {
      return;
    }

    setError("");
    setDeletingId(eventId);
    const result = await requestJson(`${endpoint}/${eventId}`, { method: "DELETE" });
    setDeletingId("");
    if (!result.ok) {
      setError(result.error);
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
                    {eventTypeLabels[abnormalEvent.event_type]} · {statusLabels[abnormalEvent.status]} · {formatPlatformDateTime(abnormalEvent.occurred_at)}
                  </p>
                  {abnormalEvent.description && <p className="mt-1 text-sm text-muted-foreground">{abnormalEvent.description}</p>}
                  {abnormalEvent.related_blood_pressure_record_id && (
                    <p className="mt-1 text-xs text-muted-foreground">关联血压记录：{abnormalEvent.related_blood_pressure_record_id}</p>
                  )}
                </div>
                <Select
                  value={abnormalEvent.status}
                  onValueChange={(status) => updateStatus(abnormalEvent, status)}
                  disabled={statusUpdatingId === abnormalEvent.id || deletingId === abnormalEvent.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">待处理</SelectItem>
                    <SelectItem value="monitoring">观察中</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => startEdit(abnormalEvent)} disabled={deletingId === abnormalEvent.id}>
                    <Pencil className="size-4" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(abnormalEvent.id)} disabled={deletingId === abnormalEvent.id}>
                    {deletingId === abnormalEvent.id ? "删除中..." : "删除"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingEvent)} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑异常记录</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={updateEvent}>
            <div className="space-y-2 md:col-span-2">
              <Label>标题</Label>
              <Input
                value={editForm.title}
                onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={editForm.eventType}
                onValueChange={(eventType) => setEditForm((current) => ({ ...current, eventType }))}
              >
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
              <Select
                value={editForm.severity}
                onValueChange={(severity) => setEditForm((current) => ({ ...current, severity }))}
              >
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
                value={editForm.occurredAt}
                onChange={(event) => setEditForm((current) => ({ ...current, occurredAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>处理状态</Label>
              <Select
                value={editForm.status}
                onValueChange={(status) => setEditForm((current) => ({ ...current, status }))}
              >
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
                value={editForm.relatedBloodPressureRecordId}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, relatedBloodPressureRecordId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>说明</Label>
              <Textarea
                value={editForm.description}
                onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            {editError && <p className="text-sm text-destructive md:col-span-2">{editError}</p>}
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditingEvent(null)}>
                取消
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "保存中..." : "保存修改"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
