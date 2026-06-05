import { HeartPulse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MissingAuthConfig({ missingKeys }: { missingKeys: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">需要配置平台环境</CardTitle>
              <p className="text-sm text-muted-foreground">当前环境缺少平台运行所需配置。</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted p-3">
            <p className="mb-2 font-medium">缺少环境变量：</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {missingKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
          <p>复制 `.env.local.example` 为 `.env.local`，填入 Supabase 项目配置后重启开发服务。</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            cp .env.local.example .env.local
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
