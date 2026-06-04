import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BloodPressureForAbnormalEvent = {
  id: string;
  family_id: string;
  elder_id: string;
  recorded_by: string;
  measured_at: string;
  systolic: number;
  diastolic: number;
  pulse: number;
};

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function validateRelatedBloodPressureRecord({
  admin,
  familyId,
  elderId,
  recordId,
}: {
  admin: SupabaseAdminClient;
  familyId: string;
  elderId: string;
  recordId?: string;
}) {
  if (!recordId) return { ok: true as const };

  const { data, error } = await admin
    .from("blood_pressure_records")
    .select("id")
    .eq("family_id", familyId)
    .eq("elder_id", elderId)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  if (!data) {
    return {
      ok: false as const,
      status: 400,
      error: "关联血压记录不存在或不属于当前老人档案",
    };
  }

  return { ok: true as const };
}

function classifyBloodPressure(record: BloodPressureForAbnormalEvent) {
  if (record.systolic >= 180 || record.diastolic >= 120) {
    return {
      severity: "critical",
      title: "紧急血压异常",
      description: `血压 ${record.systolic}/${record.diastolic} mmHg，已达到紧急关注范围。`,
    };
  }

  if (record.systolic >= 160 || record.diastolic >= 100) {
    return {
      severity: "high",
      title: "高风险血压异常",
      description: `血压 ${record.systolic}/${record.diastolic} mmHg，明显高于常规控制范围。`,
    };
  }

  if (record.systolic >= 140 || record.diastolic >= 90) {
    return {
      severity: "medium",
      title: "血压偏高",
      description: `血压 ${record.systolic}/${record.diastolic} mmHg，建议持续观察。`,
    };
  }

  if (record.systolic <= 90 || record.diastolic <= 60) {
    return {
      severity: "medium",
      title: "血压偏低",
      description: `血压 ${record.systolic}/${record.diastolic} mmHg，建议结合身体状态观察。`,
    };
  }

  return null;
}

export async function createBloodPressureAbnormalEvents(records: BloodPressureForAbnormalEvent[]) {
  const events = records
    .map((record) => {
      const classification = classifyBloodPressure(record);
      if (!classification) return null;

      return {
        family_id: record.family_id,
        elder_id: record.elder_id,
        title: classification.title,
        event_type: "blood_pressure",
        severity: classification.severity,
        occurred_at: record.measured_at,
        status: "open",
        description: classification.description,
        related_blood_pressure_record_id: record.id,
        created_by: record.recorded_by,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  if (events.length === 0) return { created: 0, error: null };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("abnormal_events").insert(events);
  return { created: error ? 0 : events.length, error };
}
