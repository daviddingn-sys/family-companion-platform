"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/client-http";

type DataRequest = {
  id: string;
  request_type: string;
  status: string;
  source: string;
  note: string | null;
  created_at: string;
};

type OperationLog = {
  id: string;
  action: string;
  resource_type: string;
  source: string;
  created_at: string;
};

type DataControlsProps = {
  dataRequests: DataRequest[];
  operationLogs: OperationLog[];
};

const requestTypeLabels: Record<string, string> = {
  export_all: "全部数据导出",
  delete_all: "全部数据删除",
};

const statusLabels: Record<string, string> = {
  submitted: "已提交",
  processing: "处理中",
  completed: "已完成",
  rejected: "已拒绝",
};

export function DataControls({ dataRequests, operationLogs }: DataControlsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitDeleteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("将提交全部数据删除申请。提交后需要人工或后台流程处理，确定继续吗？")) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    const result = await requestJson("/api/data-requests", {
      method: "POST",
      body: JSON.stringify({
        requestType: "delete_all",
        note,
      }),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNote("");
    setMessage("删除申请已提交。");
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="size-4" />
            数据导出
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">导出当前账号可访问范围内的家庭、成员和健康数据，文件为 JSON 格式。</p>
          <Button asChild>
            <a href="/api/data-export">导出全部数据</a>
          </Button>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="text-primary" href="/legal/data-export">
              数据导出说明
            </Link>
            <Link className="text-primary" href="/legal/privacy-policy">
              隐私政策
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="size-4" />
            数据删除申请
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submitDeleteRequest}>
            <p className="text-sm text-muted-foreground">提交后会进入处理队列，不会在前端静默删除数据。</p>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可填写删除原因或联系方式补充说明"
              maxLength={500}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "提交中..." : "提交删除申请"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            数据请求记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无数据请求。</p>
          ) : (
            <div className="grid gap-2">
              {dataRequests.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {requestTypeLabels[item.request_type] ?? item.request_type} · {statusLabels[item.status] ?? item.status}
                  </p>
                  <p className="text-muted-foreground">
                    {item.source} · {item.created_at.slice(0, 16).replace("T", " ")}
                  </p>
                  {item.note && <p className="mt-1">{item.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">最近安全操作</CardTitle>
        </CardHeader>
        <CardContent>
          {operationLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无操作日志。</p>
          ) : (
            <div className="grid gap-2">
              {operationLogs.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <span>
                    {item.action} · {item.resource_type}
                  </span>
                  <span className="text-muted-foreground">
                    {item.source} · {item.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
