import { AuthForm } from "@/components/auth/AuthForm";
import { MissingAuthConfig } from "@/components/auth/MissingAuthConfig";
import { getMissingPublicSupabaseEnvKeys } from "@/lib/env";

export default function LoginPage() {
  const missingKeys = getMissingPublicSupabaseEnvKeys();
  if (missingKeys.length > 0) {
    return <MissingAuthConfig missingKeys={missingKeys} />;
  }

  return <AuthForm mode="login" />;
}
