import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getMissingPublicSupabaseEnvKeys } from "@/lib/env";

export async function createSupabaseServerClient() {
  const missingKeys = getMissingPublicSupabaseEnvKeys();
  if (missingKeys.length > 0) {
    throw new Error(`Missing Supabase public environment variables: ${missingKeys.join(", ")}`);
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components cannot set cookies. Route handlers can.
          }
        },
      },
    },
  );
}
