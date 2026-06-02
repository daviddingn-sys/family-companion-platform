"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type CompanionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  created_at: string;
};

export function CompanionClient({
  familyId,
  elderId,
  elderName,
}: {
  familyId: string;
  elderId: string;
  elderName: string;
}) {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const endpoint = useMemo(
    () => `/api/families/${familyId}/elders/${elderId}/companion-messages`,
    [familyId, elderId],
  );

  const load = useCallback(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then((result) => setMessages(result.messages ?? []))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setError("");
    setSending(true);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const result = await response.json();
    setSending(false);

    if (!response.ok) {
      setError(result.error ?? "发送失败");
      return;
    }

    setContent("");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{elderName}的吾伴 AI</h1>
        <p className="text-sm text-muted-foreground">基础陪伴对话已接入；不替代医生诊断和紧急处置。</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            陪伴对话
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[360px] space-y-3 rounded-md border bg-muted/30 p-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无对话，可以先问候一下或记录今天的身体感受。</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Bot className="size-4" />
                    </span>
                  )}
                  <div className={`max-w-[80%] rounded-md border p-3 text-sm ${message.role === "user" ? "bg-card" : "bg-background"}`}>
                    <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString("zh-CN")}
                      {message.model ? ` · ${message.model}` : ""}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <User className="size-4" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <form className="space-y-3" onSubmit={submit}>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="输入想对吾伴 AI 说的话"
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={sending || !content.trim()}>
              <Send className="size-4" />
              {sending ? "发送中..." : "发送"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
