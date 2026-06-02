export const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

export const optionalEnvKeys = ["COZE_WORKLOAD_IDENTITY_API_KEY"] as const;

export function getMissingRequiredEnvKeys() {
  return requiredEnvKeys.filter((key) => !process.env[key]);
}
