"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Reminder = {
  id: string;
  title: string;
  type: string;
  due_at: string | null;
  repeat_rule: string | null;
  status: string;
  note: string | null;
};

const typeLabels: Record<string, string> = {
  medicine: "用药",
  measurement: "测量",
  appointment: "就医",
  custom: "其他",
};

const statusLabels: Record<string, string> = {
  active: "待处理",
  done: "已完成",
  paused: "暂停",
  cancelled: "取消",
};

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16).replace("T", " ");
}

export function RemindersClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "custom",
    dueAt: "",
    repeatRule: "",
    status: "active",
    note: "",
  });

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/reminders`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then((result) => setReminders(result.reminders ?? []))
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
      type: "custom",
      dueAt: "",
      repeatRule: "",
      status: "active",
      note: "",
    });
    load();
  }

  async function updateStatus(reminder: Reminder, status: string) {
    setError("");
    const response = await fetch(`${endpoint}/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: reminder.title,
        type: reminder.type,
        dueAt: toLocalInputValue(reminder.due_at),
        repeatRule: reminder.repeat_rule ?? "",
        status,
        note: reminder.note ?? "",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "更新失败");
      return;
    }
    load();
  }

  async function remove(reminderId: string) {
    if (!window.confirm("确定删除这条提醒事项吗？")) {
      return;
    }

    setError("");
    const response = await fetch(`${endpoint}/${reminderId}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold">{elderName}的提醒事项</h1>
        <p className="text-sm text-muted-foreground">基础版只记录提醒事项，不执行后台推送调度。</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            新增提醒
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reminder-title">标题</Label>
              <Input
                id="reminder-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={(type) => setForm((current) => ({ ...current, type }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicine">用药</SelectItem>
                  <SelectItem value="measurement">测量</SelectItem>
                  <SelectItem value="appointment">就医</SelectItem>
                  <SelectItem value="custom">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">待处理</SelectItem>
                  <SelectItem value="done">已完成</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                  <SelectItem value="cancelled">取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reminder-due-at">计划时间</Label>
              <Input
                id="reminder-due-at"
                value={form.dueAt}
                onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
                placeholder="如 2026-06-03 15:20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reminder-repeat-rule">重复说明</Label>
              <Input
                id="reminder-repeat-rule"
                value={form.repeatRule}
                onChange={(event) => setForm((current) => ({ ...current, repeatRule: event.target.value }))}
                placeholder="如 每天早上、每周一"
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="reminder-note">备注</Label>
              <Textarea
                id="reminder-note"
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive md:col-span-4">{error}</p>}
            <Button className="md:col-span-4" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存提醒"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" />
            提醒列表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无提醒事项。</p>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_150px_auto] md:items-center">
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[reminder.type]} · {statusLabels[reminder.status]} · {reminder.due_at ? new Date(reminder.due_at).toLocaleString("zh-CN") : "未设置时间"}
                  </p>
                  {reminder.repeat_rule && <p className="mt-1 text-sm">重复：{reminder.repeat_rule}</p>}
                  {reminder.note && <p className="mt-1 text-sm text-muted-foreground">{reminder.note}</p>}
                </div>
                <Select value={reminder.status} onValueChange={(status) => updateStatus(reminder, status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">待处理</SelectItem>
                    <SelectItem value="done">已完成</SelectItem>
                    <SelectItem value="paused">暂停</SelectItem>
                    <SelectItem value="cancelled">取消</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => remove(reminder.id)}>
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
