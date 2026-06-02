"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: profile.display_name ?? "",
    phone: profile.phone ?? "",
    avatarUrl: profile.avatar_url ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "保存失败");
      return;
    }

    router.refresh();
  }

  return (
    <Card className="max-w-xl rounded-lg">
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="displayName">姓名</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">头像地址</Label>
            <Input
              id="avatarUrl"
              value={form.avatarUrl}
              onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })}
              placeholder="https://..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : "保存资料"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
