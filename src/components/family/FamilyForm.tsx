"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/client-http";

type FamilyResponse = {
  family?: {
    id: string;
  };
};

export function FamilyForm({
  familyId,
  initialName = "",
}: {
  familyId?: string;
  initialName?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await requestJson<FamilyResponse>(familyId ? `/api/families/${familyId}` : "/api/families", {
      method: familyId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const nextFamilyId = familyId ?? result.data.family?.id;
    router.push(nextFamilyId ? `/families/${nextFamilyId}` : "/families");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="name">家庭名称</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：爸妈的家"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "保存中..." : "保存家庭"}
      </Button>
    </form>
  );
}
