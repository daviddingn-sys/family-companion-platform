"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <Card className="w-full rounded-lg">
        <CardHeader>
          <CardTitle>页面暂时无法加载</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            数据读取或服务连接出现异常，请稍后重试。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              重试
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">返回工作台</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
