"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestJson } from "@/lib/client-http";

type FamilyMembership = {
  role: string;
  families: {
    id: string;
    name: string;
    owner_user_id: string;
    created_at: string;
  };
};

type FamiliesResponse = {
  families: FamilyMembership[];
};

export function FamiliesClient() {
  const [families, setFamilies] = useState<FamilyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roleLabels: Record<string, string> = {
    owner: "所有者",
    admin: "管理员",
    member: "成员",
    viewer: "只读",
  };

  useEffect(() => {
    async function load() {
      const result = await requestJson<FamiliesResponse>("/api/families");
      if (result.ok) {
        setFamilies(result.data.families ?? []);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">家庭管理</h1>
          <p className="text-sm text-muted-foreground">每个健康数据后续都会归属到家庭和老人档案。</p>
        </div>
        <Button asChild>
          <Link href="/families/new">
            <Plus className="mr-2 size-4" />
            新建家庭
          </Link>
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : families.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="mb-4 text-sm text-muted-foreground">还没有家庭空间，请先创建一个家庭。</p>
            <Button asChild>
              <Link href="/families/new">创建家庭</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {families.map((item) => (
            <Card key={item.families.id} className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  {item.families.name}
                  <Badge variant="secondary">{roleLabels[item.role] ?? item.role}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild size="sm">
                  <Link href={`/families/${item.families.id}`}>进入</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/families/${item.families.id}/members`}>成员</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/families/${item.families.id}/elders`}>老人档案</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
