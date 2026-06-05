"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/client-http";

export function DeleteFamilyButton({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm("删除家庭会同时删除成员、老人档案和关联健康数据，确定继续吗？")) {
      return;
    }

    setError("");
    setLoading(true);
    const result = await requestJson(`/api/families/${familyId}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE_FAMILY" }),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/families");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={remove} disabled={loading}>
        {loading ? "删除中..." : "删除家庭"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
