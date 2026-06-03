"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HealthReport = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  title: string;
  summary: string;
  ai_summary: string | null;
  ai_model: string | null;
  ai_generated_at: string | null;
  stats: {
    bloodPressure?: {
      count?: number;
      avgSystolic?: number | null;
      avgDiastolic?: number | null;
      avgPulse?: number | null;
    };
    reminders?: {
      count?: number;
    };
    abnormalEvents?: {
      count?: number;
    };
  };
  created_at: string;
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange(periodType: string) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const start = new Date(end);
  if (periodType === "monthly") {
    start.setUTCDate(1);
  } else {
    start.setUTCDate(start.getUTCDate() - 6);
  }
  return {
    periodStart: toDateInputValue(start),
    periodEnd: toDateInputValue(end),
  };
}

export function HealthReportsClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const initialRange = defaultRange("weekly");
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSummaryId, setGeneratingSummaryId] = useState("");
  const [form, setForm] = useState({
    periodType: "weekly",
    periodStart: initialRange.periodStart,
    periodEnd: initialRange.periodEnd,
  });

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/reports`,
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
        setReports(result.reports ?? []);
      })
      .catch((loadError: Error) => {
        setLoadError(loadError.message || "健康报告加载失败");
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  function changePeriodType(periodType: string) {
    setForm({ periodType, ...defaultRange(periodType) });
  }

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
      setError(result.error ?? "生成失败");
      return;
    }
    load();
  }

  async function remove(reportId: string) {
    if (!window.confirm("确定删除这份健康报告吗？")) {
      return;
    }

    setError("");
    const response = await fetch(`${endpoint}/${reportId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "删除失败");
      return;
    }
    load();
  }

  async function generateSummary(reportId: string) {
    setError("");
    setGeneratingSummaryId(reportId);
    const response = await fetch(`${endpoint}/${reportId}/ai-summary`, { method: "POST" });
    const result = await response.json();
    setGeneratingSummaryId("");

    if (!response.ok) {
      setError(result.error ?? "AI 总结生成失败");
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{elderName}的健康报告</h1>
        <p className="text-sm text-muted-foreground">基础版生成规则化周报/月报，不包含 AI 健康总结。</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            生成报告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>报告类型</Label>
              <Select value={form.periodType} onValueChange={changePeriodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">周报</SelectItem>
                  <SelectItem value="monthly">月报</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={form.periodStart}
                onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={form.periodEnd}
                onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))}
                required
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={saving}>
                {saving ? "生成中..." : "生成报告"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive md:col-span-4">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            报告列表
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无健康报告。</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.period_type === "weekly" ? "周报" : "月报"} · {report.period_start} 至 {report.period_end} · {new Date(report.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateSummary(report.id)} disabled={generatingSummaryId === report.id}>
                      <Sparkles className="size-4" />
                      {generatingSummaryId === report.id ? "生成中" : "AI 总结"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => remove(report.id)}>
                      删除
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 text-sm md:grid-cols-3">
                  <div className="rounded-md bg-muted p-3">血压记录：{report.stats.bloodPressure?.count ?? 0} 次</div>
                  <div className="rounded-md bg-muted p-3">
                    平均血压：{report.stats.bloodPressure?.avgSystolic ?? "-"} / {report.stats.bloodPressure?.avgDiastolic ?? "-"}
                  </div>
                  <div className="rounded-md bg-muted p-3">异常记录：{report.stats.abnormalEvents?.count ?? 0} 条</div>
                </div>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-sans leading-6">{report.summary}</pre>
                {report.ai_summary && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4" />
                      AI 健康总结
                      <span className="text-xs font-normal text-muted-foreground">
                        {report.ai_model} · {report.ai_generated_at ? new Date(report.ai_generated_at).toLocaleString("zh-CN") : ""}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-6">{report.ai_summary}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
