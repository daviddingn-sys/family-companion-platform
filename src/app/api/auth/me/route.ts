import { NextResponse } from "next/server";
import { ensureProfile, getRouteUser } from "@/lib/permissions";

export async function GET() {
  const user = await getRouteUser();
  if (user instanceof NextResponse) {
    return user;
  }

  await ensureProfile(user);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.user_metadata?.display_name ?? user.email?.split("@")[0],
    },
  });
}
