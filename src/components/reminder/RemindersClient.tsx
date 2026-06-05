"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Pencil, Plus } from "lucide-react";
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

type Reminder = {
  id: string;
  title: string;
  type: string;
  due_at: string | null;
  repeat_rule: string | null;
  status: string;
  note: string | null;
};

type RemindersResponse = {
  reminders: Reminder[];
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
  return formatPlatformLocalMinuteInput(value).replace("T", " ");
}

const emptyReminderForm = {
  title: "",
  type: "custom",
  dueAt: "",
  repeatRule: "",
  status: "active",
  note: "",
};

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
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [form, setForm] = useState(emptyReminderForm);
  const [editForm, setEditForm] = useState(emptyReminderForm);

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/reminders`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    async function run() {
      const result = await requestJson<RemindersResponse>(endpoint);
      if (result.ok) {
        setLoadError("");
        setReminders(result.data.reminders ?? []);
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

    setForm(emptyReminderForm);
    load();
  }

  function startEdit(reminder: Reminder) {
    setEditError("");
    setEditingReminder(reminder);
    setEditForm({
      title: reminder.title,
      type: reminder.type,
      dueAt: toLocalInputValue(reminder.due_at),
      repeatRule: reminder.repeat_rule ?? "",
      status: reminder.status,
      note: reminder.note ?? "",
    });
  }

  async function updateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingReminder) return;

    setEditError("");
    setUpdating(true);
    const result = await requestJson(`${endpoint}/${editingReminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setUpdating(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditingReminder(null);
    load();
  }

  async function updateStatus(reminder: Reminder, status: string) {
    setError("");
    setStatusUpdatingId(reminder.id);
    const result = await requestJson(`${endpoint}/${reminder.id}`, {
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
    setStatusUpdatingId("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  async function remove(reminderId: string) {
    if (!window.confirm("确定删除这条提醒事项吗？")) {
      return;
    }

    setError("");
    setDeletingId(reminderId);
    const result = await requestJson(`${endpoint}/${reminderId}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold">{elderName}的提醒事项</h1>
        <p className="text-sm text-muted-foreground">记录用药、测量、就医和自定义事项，当前版本不执行后台推送调度。</p>
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
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无提醒事项。</p>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_150px_auto] md:items-center">
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[reminder.type]} · {statusLabels[reminder.status]} · {reminder.due_at ? formatPlatformDateTime(reminder.due_at) : "未设置时间"}
                  </p>
                  {reminder.repeat_rule && <p className="mt-1 text-sm">重复：{reminder.repeat_rule}</p>}
                  {reminder.note && <p className="mt-1 text-sm text-muted-foreground">{reminder.note}</p>}
                </div>
                <Select
                  value={reminder.status}
                  onValueChange={(status) => updateStatus(reminder, status)}
                  disabled={statusUpdatingId === reminder.id || deletingId === reminder.id}
                >
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
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => startEdit(reminder)} disabled={deletingId === reminder.id}>
                    <Pencil className="size-4" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(reminder.id)} disabled={deletingId === reminder.id}>
                    {deletingId === reminder.id ? "删除中..." : "删除"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingReminder)} onOpenChange={(open) => !open && setEditingReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑提醒事项</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={updateReminder}>
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
                value={editForm.type}
                onValueChange={(type) => setEditForm((current) => ({ ...current, type }))}
              >
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
              <Select
                value={editForm.status}
                onValueChange={(status) => setEditForm((current) => ({ ...current, status }))}
              >
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
            <div className="space-y-2">
              <Label>计划时间</Label>
              <Input
                value={editForm.dueAt}
                onChange={(event) => setEditForm((current) => ({ ...current, dueAt: event.target.value }))}
                placeholder="如 2026-06-03 15:20"
              />
            </div>
            <div className="space-y-2">
              <Label>重复说明</Label>
              <Input
                value={editForm.repeatRule}
                onChange={(event) => setEditForm((current) => ({ ...current, repeatRule: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>备注</Label>
              <Textarea
                value={editForm.note}
                onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
            {editError && <p className="text-sm text-destructive md:col-span-2">{editError}</p>}
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditingReminder(null)}>
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
