import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
