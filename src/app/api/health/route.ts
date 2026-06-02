import { NextResponse } from "next/server";
import { getMissingRequiredEnvKeys, optionalEnvKeys, requiredEnvKeys } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingRequiredEnv = getMissingRequiredEnvKeys();
  const optionalEnv = Object.fromEntries(
    optionalEnvKeys.map((key) => [key, Boolean(process.env[key])]),
  );

  if (missingRequiredEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing_required_env",
        requiredEnv: requiredEnvKeys,
        missingRequiredEnv,
        optionalEnv,
      },
      { status: 503 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "database_unavailable",
        database: {
          ok: false,
          message: error.message,
        },
        optionalEnv,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "ready",
    database: {
      ok: true,
    },
    optionalEnv,
  });
}
