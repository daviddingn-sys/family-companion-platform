"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/client-http";
import { normalizeChinaPhoneToE164, phoneToAuthEmail } from "@/lib/phone";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  function getAuthErrorMessage(message: string) {
    if (/invalid login credentials/i.test(message)) {
      return "手机号或密码不正确。";
    }
    if (/signup|signups|not allowed|disabled/i.test(message)) {
      return "当前项目尚未允许账号注册，请检查 Supabase Auth 配置。";
    }
    return message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedPhone = normalizeChinaPhoneToE164(phone);
    if (!normalizedPhone) {
      setError("请输入有效的中国大陆手机号");
      return;
    }

    setLoading(true);
    const displayNameValue = displayName.trim() || phone.trim();

    if (!isLogin) {
      const registerResult = await requestJson("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password, displayName: displayNameValue }),
      });

      if (!registerResult.ok) {
        setLoading(false);
        setError(registerResult.error);
        return;
      }
    }

    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(normalizedPhone),
      password,
    });

    if (!result.error && result.data.user && !isLogin) {
      await supabase.auth.updateUser({
        data: {
          display_name: displayNameValue,
          phone: normalizedPhone,
        },
      });
    }

    setLoading(false);

    if (result.error) {
      setError(getAuthErrorMessage(result.error.message));
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
                {isLogin ? "使用手机号和密码登录" : "用手机号创建家庭空间"}
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
                  disabled={loading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="13800138000"
                disabled={loading}
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
                disabled={loading}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">当前阶段暂不提供自助找回密码，需要由管理员重置。</p>
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
