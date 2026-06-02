"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteElderButton({
  familyId,
  elderId,
}: {
  familyId: string;
  elderId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function remove() {
    setError("");
    setLoading(true);
    const response = await fetch(`/api/families/${familyId}/elders/${elderId}`, {
      method: "DELETE",
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "删除失败");
      return;
    }

    router.push(`/families/${familyId}/elders`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={remove} disabled={loading}>
        {loading ? "删除中..." : "删除档案"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
