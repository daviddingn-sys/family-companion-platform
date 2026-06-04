"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Camera, Download, FileUp, Pencil, Plus, ScanText, TrendingUp } from "lucide-react";
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

type BloodPressureRecord = {
  id: string;
  measured_at: string;
  period: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  status: string;
  source: string;
  image_key: string | null;
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

const chartMetrics = [
  { key: "systolic", label: "高压", color: "#dc2626" },
  { key: "diastolic", label: "低压", color: "#2563eb" },
  { key: "pulse", label: "脉搏", color: "#059669" },
] as const;

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

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return defaultMeasuredAt();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
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
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingRecord, setEditingRecord] = useState<BloodPressureRecord | null>(null);
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    measuredAt: defaultMeasuredAt(),
    period: defaultPeriod(),
    systolic: "",
    diastolic: "",
    pulse: "",
    note: "",
  });
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
        if (result.error) {
          throw new Error(result.error);
        }
        setLoadError("");
        setRecords(result.records ?? []);
        setSummary(result.summary ?? null);
      })
      .catch((loadError: Error) => {
        setLoadError(loadError.message || "血压记录加载失败");
      })
      .finally(() => setLoading(false));
  }, [endpoint, month]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaveMessage("");
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
        imageKey,
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

    if (result.abnormalEventsCreated > 0) {
      setSaveMessage(`已保存记录，并自动生成 ${result.abnormalEventsCreated} 条异常记录。`);
    } else {
      setSaveMessage("已保存记录。");
    }

    setForm({
      measuredAt: defaultMeasuredAt(),
      period: defaultPeriod(),
      systolic: "",
      diastolic: "",
      pulse: "",
      note: "",
    });
    setImageKey("");
    setImageUrl("");
    load();
  }

  function startEdit(record: BloodPressureRecord) {
    setEditError("");
    setEditingRecord(record);
    setEditForm({
      measuredAt: toLocalInputValue(record.measured_at),
      period: record.period,
      systolic: String(record.systolic),
      diastolic: String(record.diastolic),
      pulse: String(record.pulse),
      note: record.note ?? "",
    });
  }

  async function updateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRecord) return;

    setEditError("");
    setUpdating(true);
    const response = await fetch(`${endpoint}/${editingRecord.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: new Date(editForm.measuredAt).toISOString(),
        period: editForm.period,
        systolic: editForm.systolic,
        diastolic: editForm.diastolic,
        pulse: editForm.pulse,
        note: editForm.note,
        imageKey: editingRecord.image_key ?? "",
        source: editingRecord.source,
        status: editingRecord.status,
      }),
    });
    const result = await response.json();
    setUpdating(false);

    if (!response.ok) {
      setEditError(result.error ?? "更新失败");
      return;
    }

    if (result.abnormalEventsCreated > 0) {
      setSaveMessage(`已保存修改，并自动生成 ${result.abnormalEventsCreated} 条异常记录。`);
    } else if (result.abnormalEventsUpdated > 0) {
      setSaveMessage(`已保存修改，并同步 ${result.abnormalEventsUpdated} 条异常记录。`);
    } else {
      setSaveMessage("已保存修改。");
    }

    setEditingRecord(null);
    load();
  }

  async function remove(recordId: string) {
    if (!window.confirm("确定删除这条血压记录吗？")) {
      return;
    }

    setError("");
    const response = await fetch(`${endpoint}/${recordId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "删除失败");
      return;
    }
    load();
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${endpoint}/upload`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    setUploading(false);

    if (!response.ok) {
      setError(result.error ?? "图片上传失败");
      return;
    }

    setImageKey(result.key);
    const signedResponse = await fetch(`${endpoint}/image-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: result.key }),
    });
    const signed = await signedResponse.json();
    if (signed.url) {
      setImageUrl(signed.url);
    }
  }

  async function recognizeImage() {
    if (!imageKey) {
      setError("请先上传血压计照片");
      return;
    }

    setError("");
    setRecognizing(true);
    const response = await fetch(`${endpoint}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: imageKey }),
    });
    const result = await response.json();
    setRecognizing(false);

    if (!response.ok) {
      setError(result.error ?? "OCR 识别失败");
      return;
    }

    setForm((current) => ({
      ...current,
      systolic: result.data?.systolic ? String(result.data.systolic) : current.systolic,
      diastolic: result.data?.diastolic ? String(result.data.diastolic) : current.diastolic,
      pulse: result.data?.pulse ? String(result.data.pulse) : current.pulse,
    }));
  }

  async function importFile(file: File | null) {
    if (!file) return;
    setError("");
    setImportMessage("");
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${endpoint}/import`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    setImporting(false);

    if (!response.ok) {
      setError(result.error ?? "导入失败");
      return;
    }

    setImportMessage(
      `导入完成：成功 ${result.inserted} 条，失败 ${result.failed} 条，自动生成异常记录 ${result.abnormalEventsCreated ?? 0} 条`,
    );
    load();
  }

  function generateLine(points: { x: number; y: number }[]) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  }

  function renderTrendChart() {
    const confirmed = records
      .filter((record) => record.status === "confirmed")
      .slice()
      .reverse();

    if (confirmed.length === 0) {
      return <p className="text-sm text-muted-foreground">本月暂无可绘制的确认记录。</p>;
    }

    const values = confirmed.flatMap((record) => [record.systolic, record.diastolic, record.pulse]);
    const min = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
    const max = Math.ceil((Math.max(...values) + 10) / 10) * 10;
    const range = max - min || 1;
    const width = Math.max(confirmed.length * 58, 680);
    const height = 260;
    const left = 42;
    const right = 18;
    const top = 18;
    const bottom = 42;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const xFor = (index: number) =>
      left + (confirmed.length === 1 ? chartWidth / 2 : (index / (confirmed.length - 1)) * chartWidth);
    const yFor = (value: number) => top + chartHeight - ((value - min) / range) * chartHeight;
    const ticks = Array.from({ length: 5 }, (_, index) => Math.round(min + (range / 4) * index));

    return (
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} y1={yFor(tick)} x2={width - right} y2={yFor(tick)} stroke="#e5e7eb" />
              <text x={left - 8} y={yFor(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {tick}
              </text>
            </g>
          ))}
          {confirmed.map((record, index) => (
            <text
              key={record.id}
              x={xFor(index)}
              y={height - 12}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {new Date(record.measured_at).getDate()}日
            </text>
          ))}
          {chartMetrics.map((metric) => {
            const points = confirmed.map((record, index) => ({
              x: xFor(index),
              y: yFor(record[metric.key]),
            }));
            return (
              <g key={metric.key}>
                <path
                  d={generateLine(points)}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((point, index) => (
                  <circle
                    key={`${metric.key}-${confirmed[index].id}`}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={metric.color}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{elderName}的血压记录</h1>
          <p className="text-sm text-muted-foreground">当前模块已按家庭和老人档案隔离数据。</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Input
            className="w-36"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <Button asChild variant="outline">
            <a href={`${endpoint}/export?month=${month}`}>
              <Download className="size-4" />
              导出 CSV
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`${endpoint}/export?month=${month}&format=xlsx`}>
              <Download className="size-4" />
              导出 Excel
            </a>
          </Button>
        </div>
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
                onChange={(event) => setForm((current) => ({ ...current, measuredAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>时段</Label>
              <Select value={form.period} onValueChange={(period) => setForm((current) => ({ ...current, period }))}>
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
                onChange={(event) => setForm((current) => ({ ...current, systolic: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>低压</Label>
              <Input
                type="number"
                value={form.diastolic}
                onChange={(event) => setForm((current) => ({ ...current, diastolic: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>脉搏</Label>
              <Input
                type="number"
                value={form.pulse}
                onChange={(event) => setForm((current) => ({ ...current, pulse: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-6">
              <Label>备注</Label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
            <div className="space-y-3 rounded-md border bg-muted/30 p-3 md:col-span-6">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="mr-2">血压计照片</Label>
                <Input
                  className="max-w-sm"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(event) => uploadImage(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!imageKey || recognizing}
                  onClick={recognizeImage}
                >
                  {recognizing ? (
                    "识别中..."
                  ) : (
                    <>
                      <ScanText className="size-4" />
                      OCR 识别
                    </>
                  )}
                </Button>
              </div>
              {uploading && <p className="text-sm text-muted-foreground">图片上传中...</p>}
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="血压计照片"
                  className="max-h-56 rounded-md border bg-background object-contain"
                />
              )}
              <p className="text-xs text-muted-foreground">
                OCR 需要配置 COZE_WORKLOAD_IDENTITY_API_KEY；识别结果会填入高压、低压和脉搏输入框。
              </p>
            </div>
            {error && <p className="text-sm text-destructive md:col-span-6">{error}</p>}
            {saveMessage && <p className="text-sm text-muted-foreground md:col-span-6">{saveMessage}</p>}
            <Button className="md:col-span-6" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存记录"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4" />
            月度趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {chartMetrics.map((metric) => (
              <span key={metric.key} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: metric.color }} />
                {metric.label}
              </span>
            ))}
          </div>
          {renderTrendChart()}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="size-4" />
            导入记录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={importing}
            onChange={(event) => importFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            支持列名：日期、时间、时段、高压、低压、脉搏、备注。
          </p>
          {importMessage && <p className="text-sm text-muted-foreground">{importMessage}</p>}
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
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
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
                  {record.image_key && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="size-3" />
                      已关联照片
                    </p>
                  )}
                  {record.note && <p className="mt-1 text-sm">{record.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => startEdit(record)}>
                    <Pencil className="size-4" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(record.id)}>
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingRecord)} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑血压记录</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={updateRecord}>
            <div className="space-y-2 md:col-span-2">
              <Label>测量时间</Label>
              <Input
                type="datetime-local"
                value={editForm.measuredAt}
                onChange={(event) => setEditForm((current) => ({ ...current, measuredAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>时段</Label>
              <Select
                value={editForm.period}
                onValueChange={(period) => setEditForm((current) => ({ ...current, period }))}
              >
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
              <Label>脉搏</Label>
              <Input
                type="number"
                value={editForm.pulse}
                onChange={(event) => setEditForm((current) => ({ ...current, pulse: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>高压</Label>
              <Input
                type="number"
                value={editForm.systolic}
                onChange={(event) => setEditForm((current) => ({ ...current, systolic: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>低压</Label>
              <Input
                type="number"
                value={editForm.diastolic}
                onChange={(event) => setEditForm((current) => ({ ...current, diastolic: event.target.value }))}
                required
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
              <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>
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
