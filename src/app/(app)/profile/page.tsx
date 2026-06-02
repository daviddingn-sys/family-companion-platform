import { ProfileForm } from "@/components/profile/ProfileForm";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  await ensureProfile(user);

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name,phone,avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">个人资料</h1>
        <p className="text-sm text-muted-foreground">用于家庭成员展示和后续邀请识别。</p>
      </div>
      <ProfileForm profile={profile ?? { display_name: "", phone: "", avatar_url: "" }} />
    </div>
  );
}
