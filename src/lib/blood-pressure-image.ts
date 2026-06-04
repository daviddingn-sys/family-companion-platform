import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const BLOOD_PRESSURE_IMAGE_BUCKET = "blood-pressure-images";

export async function ensureBloodPressureImageBucket() {
  const admin = createSupabaseAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message);
  }

  const exists = buckets?.some((bucket) => bucket.name === BLOOD_PRESSURE_IMAGE_BUCKET);

  if (!exists) {
    const { error: createError } = await admin.storage.createBucket(BLOOD_PRESSURE_IMAGE_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (createError) {
      throw new Error(createError.message);
    }
  }
}

export function createBloodPressureImageKey({
  familyId,
  elderId,
  fileName,
}: {
  familyId: string;
  elderId: string;
  fileName: string;
}) {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const suffix = Math.random().toString(36).slice(2, 10);
  return `families/${familyId}/elders/${elderId}/blood-pressure/${Date.now()}-${suffix}.${ext}`;
}

export function isBloodPressureImageKeyForElder({
  key,
  familyId,
  elderId,
}: {
  key: string;
  familyId: string;
  elderId: string;
}) {
  return key.startsWith(`families/${familyId}/elders/${elderId}/blood-pressure/`);
}

export async function createBloodPressureImageSignedUrl(key: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BLOOD_PRESSURE_IMAGE_BUCKET)
    .createSignedUrl(key, 60 * 60);

  if (error || !data) {
    throw new Error(error?.message ?? "获取图片地址失败");
  }

  return data.signedUrl;
}
