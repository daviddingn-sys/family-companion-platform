import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle>页面不存在</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            该页面可能已被删除，或当前账号没有访问权限。
          </p>
          <Button asChild>
            <Link href="/dashboard">返回工作台</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
