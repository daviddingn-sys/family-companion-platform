import { AppShell } from "@/components/layout/AppShell";
import { MissingAuthConfig } from "@/components/auth/MissingAuthConfig";
import { requireUser } from "@/lib/auth";
import { getMissingRequiredEnvKeys } from "@/lib/env";
import { ensureProfile } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const missingKeys = getMissingRequiredEnvKeys();
  if (missingKeys.length > 0) {
    return <MissingAuthConfig missingKeys={missingKeys} />;
  }

  const user = await requireUser();
  await ensureProfile(user);

  return <AppShell>{children}</AppShell>;
}
