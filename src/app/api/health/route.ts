import { NextResponse } from "next/server";
import { getMissingRequiredEnvKeys, optionalEnvKeys, requiredEnvKeys } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const requiredTables = [
  "profiles",
  "families",
  "family_members",
  "elders",
  "blood_pressure_records",
  "medications",
  "reminders",
  "abnormal_events",
  "health_reports",
];

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
  const tableChecks = await Promise.all(
    requiredTables.map(async (table) => {
      const { error } = await admin.from(table).select("id", { count: "exact", head: true });
      return {
        ok: !error,
        table,
        message: error?.message,
      };
    }),
  );
  const failedTable = tableChecks.find((check) => !check.ok);

  if (failedTable) {
    return NextResponse.json(
      {
        ok: false,
        status: "database_unavailable",
        database: {
          ok: false,
          failedTable: failedTable.table,
          message: failedTable.message,
        },
        tables: tableChecks,
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
    tables: tableChecks.map(({ table, ok }) => ({ table, ok })),
    optionalEnv,
  });
}
