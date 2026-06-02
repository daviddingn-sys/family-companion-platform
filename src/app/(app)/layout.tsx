import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureProfile(user);

  return <AppShell>{children}</AppShell>;
}
