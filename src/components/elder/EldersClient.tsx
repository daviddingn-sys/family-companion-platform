"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/client-http";

type Elder = {
  id: string;
  name: string;
  gender: string;
  birth_date: string | null;
  phone: string | null;
  medical_notes: string | null;
};

type EldersResponse = {
  elders: Elder[];
};

const genderLabels: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未填写性别",
};

export function EldersClient({ familyId }: { familyId: string }) {
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const result = await requestJson<EldersResponse>(`/api/families/${familyId}/elders`);
      if (result.ok) {
        setElders(result.data.elders ?? []);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    load();
  }, [familyId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">健康档案</h1>
          <p className="text-sm text-muted-foreground">给每位家庭成员建立专属健康档案，血压、用药、提醒和报告都会归属到具体成员。</p>
        </div>
        <Button asChild>
          <Link href={`/families/${familyId}/elders/new`}>
            <Plus className="mr-2 size-4" />
            新增档案
          </Link>
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : elders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="mb-4 text-sm text-muted-foreground">还没有健康档案。</p>
            <Button asChild>
              <Link href={`/families/${familyId}/elders/new`}>新增健康档案</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {elders.map((elder) => (
            <Card key={elder.id} className="rounded-lg">
              <CardHeader>
                <CardTitle>{elder.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {genderLabels[elder.gender] ?? elder.gender} · {elder.birth_date || "未填写生日"} · {elder.phone || "未填写电话"}
                </p>
                {elder.medical_notes && <p className="line-clamp-2 text-sm">{elder.medical_notes}</p>}
                <Button asChild size="sm">
                  <Link href={`/families/${familyId}/elders/${elder.id}`}>查看档案</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
