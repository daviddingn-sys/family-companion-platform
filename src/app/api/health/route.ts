import { NextResponse } from "next/server";
import { Client, type QueryResultRow } from "pg";
import { getMissingRequiredEnvKeys, optionalEnvKeys, requiredEnvKeys } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requiredTables = [
  "profiles",
  "wechat_identities",
  "families",
  "family_members",
  "elders",
  "blood_pressure_records",
  "medications",
  "reminders",
  "abnormal_events",
  "health_reports",
  "operation_logs",
  "data_requests",
];

async function queryDatabaseCatalog<T extends QueryResultRow>(query: string, values: string[]) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<T>(query, values);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function checkTableAbsent(table: string) {
  const rows = await queryDatabaseCatalog<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name = $1 limit 1",
    [table],
  );
  return {
    ok: rows.length === 0,
    check: `${table}_absent`,
    message: rows.length === 0 ? undefined : `Unexpected current-phase table exists: ${table}`,
  };
}

async function checkColumnAbsent(table: string, column: string) {
  const rows = await queryDatabaseCatalog<{ column_name: string }>(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2 limit 1",
    [table, column],
  );
  return {
    ok: rows.length === 0,
    check: `${table}_${column}_absent`,
    message: rows.length === 0 ? undefined : `Unexpected current-phase column exists: ${table}.${column}`,
  };
}

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

  const currentPhaseGuards = await Promise.all([
    checkTableAbsent("companion_messages"),
    checkColumnAbsent("health_reports", "ai_summary"),
  ]);
  const failedGuard = currentPhaseGuards.find((check) => !check.ok);
  if (failedGuard) {
    return NextResponse.json(
      {
        ok: false,
        status: "current_phase_boundary_failed",
        database: {
          ok: false,
          failedGuard: failedGuard.check,
          message: failedGuard.message,
        },
        tables: tableChecks.map(({ table, ok }) => ({ table, ok })),
        currentPhaseGuards,
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
    currentPhaseGuards,
    optionalEnv,
  });
}
