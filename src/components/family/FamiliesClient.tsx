"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
  familyMemberCount: number;
  latestMemberUpdate: {
    name: string;
    created_at: string | null;
    updated_at: string | null;
  } | null;
};

type FamiliesResponse = {
  families: FamilyMembership[];
};

export function FamiliesClient() {
  const [families, setFamilies] = useState<FamilyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <p className="text-sm text-muted-foreground">家庭列表只管理家庭空间，成员和健康数据进入家庭后处理。</p>
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
                <CardTitle className="text-lg">{item.families.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">家庭成员：</span>
                    <span className="font-medium">{item.familyMemberCount ?? 0}人</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">最近更新：</span>
                    {item.latestMemberUpdate ? (
                      <span className="font-medium">
                        {item.latestMemberUpdate.name}{" "}
                        {(item.latestMemberUpdate.updated_at ?? item.latestMemberUpdate.created_at ?? "").slice(0, 10)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">暂无</span>
                    )}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/families/${item.families.id}`}>进入家庭</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
