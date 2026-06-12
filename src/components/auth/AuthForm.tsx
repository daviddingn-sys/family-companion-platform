"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeChinaPhoneToE164 } from "@/lib/phone";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  function getAuthErrorMessage(message: string) {
    if (/provider|twilio|sms|phone/i.test(message)) {
      return "短信服务还未配置完成，请先在 Supabase 配置 Phone Auth 的短信服务商。";
    }
    if (/invalid|token|otp|expired/i.test(message)) {
      return "验证码不正确或已过期，请重新输入或重新获取。";
    }
    if (/signup|signups|not allowed|disabled/i.test(message)) {
      return isLogin ? "该手机号尚未注册，请先注册。" : "当前项目尚未允许手机号注册，请检查 Supabase Auth 配置。";
    }
    return message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedPhone = normalizeChinaPhoneToE164(phone);
    if (!normalizedPhone) {
      setError("请输入有效的中国大陆手机号");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const displayNameValue = displayName.trim() || phone.trim();

    if (!codeSent || sentPhone !== normalizedPhone) {
      const result = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: !isLogin,
          data: { display_name: displayNameValue },
          channel: "sms",
        },
      });

      setLoading(false);

      if (result.error) {
        setError(getAuthErrorMessage(result.error.message));
        return;
      }

      setCodeSent(true);
      setSentPhone(normalizedPhone);
      setVerificationCode("");
      setSuccessMessage("验证码已发送，请查看手机短信。");
      return;
    }

    const token = verificationCode.trim();
    if (!/^\d{4,8}$/.test(token)) {
      setLoading(false);
      setError("请输入短信验证码");
      return;
    }

    const result = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: "sms",
    });

    if (!result.error && result.data.user && !isLogin && displayNameValue) {
      await supabase.auth.updateUser({
        data: { display_name: displayNameValue },
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

  async function resendCode() {
    setError("");
    setSuccessMessage("");
    const normalizedPhone = normalizeChinaPhoneToE164(phone);
    if (!normalizedPhone) {
      setError("请输入有效的中国大陆手机号");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: !isLogin,
        data: { display_name: displayName.trim() || phone.trim() },
        channel: "sms",
      },
    });
    setLoading(false);

    if (result.error) {
      setError(getAuthErrorMessage(result.error.message));
      return;
    }

    setCodeSent(true);
    setSentPhone(normalizedPhone);
    setVerificationCode("");
    setSuccessMessage("验证码已重新发送。");
  }

  function changePhone() {
    setCodeSent(false);
    setSentPhone("");
    setVerificationCode("");
    setSuccessMessage("");
    setError("");
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
                {isLogin ? "使用手机号验证码登录" : "用手机号创建家庭空间"}
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
                  disabled={loading || codeSent}
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
                disabled={loading || codeSent}
                required
              />
            </div>
            {codeSent && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">短信验证码</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="请输入验证码"
                  required
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "处理中..." : codeSent ? "完成验证" : "获取验证码"}
            </Button>
          </form>
          {codeSent && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <button className="text-muted-foreground underline-offset-4 hover:underline" type="button" onClick={changePhone}>
                修改手机号
              </button>
              <button className="text-primary underline-offset-4 hover:underline" type="button" onClick={resendCode} disabled={loading}>
                重新发送
              </button>
            </div>
          )}
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
