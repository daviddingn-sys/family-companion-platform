export const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

export const optionalEnvKeys = [
  "COZE_WORKLOAD_IDENTITY_API_KEY",
  "WECHAT_MINIPROGRAM_APPID",
  "WECHAT_MINIPROGRAM_SECRET",
  "WECHAT_MINIPROGRAM_SESSION_SECRET",
] as const;
export const publicSupabaseEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
export const adminSupabaseEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getMissingRequiredEnvKeys() {
  return requiredEnvKeys.filter((key) => !process.env[key]);
}

export function getMissingPublicSupabaseEnvKeys() {
  return publicSupabaseEnvKeys.filter((key) => !process.env[key]);
}

export function getMissingAdminSupabaseEnvKeys() {
  return adminSupabaseEnvKeys.filter((key) => !process.env[key]);
}
