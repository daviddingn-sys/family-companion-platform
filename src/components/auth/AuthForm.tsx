"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";

function AuthFormInner({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";
  const verified = searchParams.get("verified") === "1";
  const callbackFailed = searchParams.get("error") === "auth_callback_failed";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/login%3Fverified%3D1`,
          },
        });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (!isLogin && !result.data.session) {
      setSuccessMessage("注册成功。请打开邮箱完成验证，验证后会回到本平台登录页。");
      setPassword("");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">家庭陪伴平台</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "登录账户继续管理家庭档案" : "创建账户并建立家庭空间"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">姓名</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：David"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            {isLogin && verified && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                邮箱验证已完成，请登录。
              </p>
            )}
            {isLogin && callbackFailed && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                邮箱验证回调失败，请重新打开邮件链接或重新注册。
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "还没有账户？" : "已有账户？"}
            <Link
              className="ml-1 text-primary underline-offset-4 hover:underline"
              href={isLogin ? "/register" : "/login"}
            >
              {isLogin ? "注册" : "登录"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  return (
    <Suspense fallback={null}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
