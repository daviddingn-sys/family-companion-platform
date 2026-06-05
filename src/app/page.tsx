import { redirect } from "next/navigation";
import { MissingAuthConfig } from "@/components/auth/MissingAuthConfig";
import { getCurrentUser } from "@/lib/auth";
import { getMissingRequiredEnvKeys } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const missingKeys = getMissingRequiredEnvKeys();
  if (missingKeys.length > 0) {
    return <MissingAuthConfig missingKeys={missingKeys} />;
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: membership } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/families/new");
  }

  redirect("/dashboard");
}
