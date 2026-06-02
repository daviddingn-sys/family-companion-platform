import { createClient } from "@supabase/supabase-js";
import { getMissingAdminSupabaseEnvKeys } from "@/lib/env";

export function createSupabaseAdminClient() {
  const missingKeys = getMissingAdminSupabaseEnvKeys();
  if (missingKeys.length > 0) {
    throw new Error(`Missing Supabase admin environment variables: ${missingKeys.join(", ")}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
