import { NextRequest, NextResponse } from "next/server";
import {
  BLOOD_PRESSURE_IMAGE_BUCKET,
  createBloodPressureImageKey,
  ensureBloodPressureImageBucket,
} from "@/lib/blood-pressure-image";
import { getRouteUser, requireElderInFamily, requireFamilyRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片" }, { status: 400 });
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG、PNG、WebP 图片" }, { status: 400 });
  }

  await ensureBloodPressureImageBucket();

  const key = createBloodPressureImageKey({ familyId, elderId, fileName: file.name });
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(BLOOD_PRESSURE_IMAGE_BUCKET)
    .upload(key, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ key, fileName: file.name });
}
