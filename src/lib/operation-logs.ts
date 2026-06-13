import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OperationLogInput = {
  actorUserId?: string | null;
  familyId?: string | null;
  elderId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  source?: string;
  request?: NextRequest;
  metadata?: Record<string, unknown> | null;
};

function getClientIp(request?: NextRequest) {
  if (!request) return null;
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function writeOperationLog(input: OperationLogInput) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("operation_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    family_id: input.familyId ?? null,
    elder_id: input.elderId ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    source: input.source ?? "web",
    ip_address: getClientIp(input.request),
    user_agent: input.request?.headers.get("user-agent") ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error("Failed to write operation log", error);
  }
}
