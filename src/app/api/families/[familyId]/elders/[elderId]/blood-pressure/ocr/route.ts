import { NextRequest, NextResponse } from "next/server";
import {
  createBloodPressureImageSignedUrl,
  isBloodPressureImageKeyForElder,
} from "@/lib/blood-pressure-image";
import { recognizeBloodPressureImage } from "@/lib/blood-pressure-ocr";
import { getRouteUser, requireElderInFamily, requireFamilyRole } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; elderId: string }> },
) {
  const { familyId, elderId } = await params;
  const user = await getRouteUser();
  if (user instanceof NextResponse) return user;

  const membership = await requireFamilyRole(familyId, user.id, ["owner", "admin", "member"]);
  if (membership instanceof NextResponse) return membership;

  const elder = await requireElderInFamily(familyId, elderId);
  if (elder instanceof NextResponse) return elder;

  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? "");
  if (!key || !isBloodPressureImageKeyForElder({ key, familyId, elderId })) {
    return NextResponse.json({ error: "图片 key 无效" }, { status: 400 });
  }

  try {
    const imageUrl = await createBloodPressureImageSignedUrl(key);
    const result = await recognizeBloodPressureImage(imageUrl);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR 识别失败" },
      { status: 500 },
    );
  }
}
