import { NextResponse } from "next/server";
import { ensureRouteProfile, getRouteUser } from "@/lib/permissions";

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const profileError = await ensureRouteProfile(user);
  if (profileError) return profileError;

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone ?? user.user_metadata?.phone,
      displayName: user.user_metadata?.display_name ?? user.phone ?? user.user_metadata?.phone,
    },
  });
}
