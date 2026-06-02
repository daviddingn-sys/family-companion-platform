import { NextRequest, NextResponse } from "next/server";
import {
  createBloodPressureImageSignedUrl,
  isBloodPressureImageKeyForElder,
} from "@/lib/blood-pressure-image";
import { getRouteUser, requireFamilyMember } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyMember(familyId, user.id);
  if (membership instanceof NextResponse) return membership;

  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? "");
  if (!key || !isBloodPressureImageKeyForElder({ key, familyId, elderId })) {
    return NextResponse.json({ error: "图片 key 无效" }, { status: 400 });
  }

  try {
    const url = await createBloodPressureImageSignedUrl(key);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取图片地址失败" },
      { status: 500 },
    );
  }
}
