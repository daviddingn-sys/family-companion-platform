"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestJson } from "@/lib/client-http";

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
    medications?: {
      activeCount?: number;
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

type HealthReportsResponse = {
  reports: HealthReport[];
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
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    async function run() {
      const result = await requestJson<HealthReportsResponse>(endpoint);
      if (result.ok) {
        setLoadError("");
        setReports(result.data.reports ?? []);
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

  function changePeriodType(periodType: string) {
    setForm({ periodType, ...defaultRange(periodType) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
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
    setMessage("健康报告已生成。");
    load();
  }

  async function remove(reportId: string) {
    if (!window.confirm("确定删除这份健康报告吗？")) {
      return;
    }

    setError("");
    setMessage("");
    const result = await requestJson(`${endpoint}/${reportId}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("健康报告已删除。");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{elderName}的健康报告</h1>
        <p className="text-sm text-muted-foreground">生成规则化周报/月报，帮助家庭成员定期查看健康数据。</p>
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
            {message && <p className="text-sm text-muted-foreground md:col-span-4">{message}</p>}
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
                    <Button asChild variant="outline" size="sm">
                      <a href={`${endpoint}/${report.id}?format=markdown`}>
                        <Download className="size-4" />
                        下载
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => remove(report.id)}>
                      删除
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 text-sm md:grid-cols-5">
                  <div className="rounded-md bg-muted p-3">血压记录：{report.stats.bloodPressure?.count ?? 0} 次</div>
                  <div className="rounded-md bg-muted p-3">
                    平均血压：{report.stats.bloodPressure?.avgSystolic ?? "-"} / {report.stats.bloodPressure?.avgDiastolic ?? "-"}
                  </div>
                  <div className="rounded-md bg-muted p-3">用药方案：{report.stats.medications?.activeCount ?? 0} 项</div>
                  <div className="rounded-md bg-muted p-3">提醒事项：{report.stats.reminders?.count ?? 0} 项</div>
                  <div className="rounded-md bg-muted p-3">异常记录：{report.stats.abnormalEvents?.count ?? 0} 条</div>
                </div>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-sans leading-6">{report.summary}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
