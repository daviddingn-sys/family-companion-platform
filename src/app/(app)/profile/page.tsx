import { PasswordForm } from "@/components/profile/PasswordForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseRow } from "@/lib/supabase/require-row";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  await ensureProfile(user);

  const admin = createSupabaseAdminClient();
  const profile = requireSupabaseRow(
    await admin
      .from("profiles")
      .select("display_name,phone,avatar_url")
      .eq("id", user.id)
      .single(),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">个人资料</h1>
        <p className="text-sm text-muted-foreground">用于协作成员展示和后续邀请识别。</p>
      </div>
      <ProfileForm profile={profile} />
      <PasswordForm />
    </div>
  );
}
