CREATE TABLE IF NOT EXISTS "data_migration_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid,
  "initiated_by" uuid,
  "legacy_source" text NOT NULL,
  "legacy_user_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "summary" jsonb,
  "note" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "data_migration_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL,
  "family_id" uuid,
  "elder_id" uuid,
  "legacy_source" text NOT NULL,
  "legacy_record_type" text NOT NULL,
  "legacy_record_id" text NOT NULL,
  "target_resource_type" text,
  "target_resource_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "data_migration_batches" ADD CONSTRAINT "data_migration_batches_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_migration_batches" ADD CONSTRAINT "data_migration_batches_initiated_by_profiles_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_migration_logs" ADD CONSTRAINT "data_migration_logs_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_migration_logs" ADD CONSTRAINT "data_migration_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_migration_logs" ADD CONSTRAINT "data_migration_logs_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "data_migration_batches_family_created_at_idx" ON "data_migration_batches" USING btree ("family_id","created_at");
CREATE INDEX IF NOT EXISTS "data_migration_batches_legacy_user_idx" ON "data_migration_batches" USING btree ("legacy_source","legacy_user_key");
CREATE INDEX IF NOT EXISTS "data_migration_batches_status_idx" ON "data_migration_batches" USING btree ("status");
CREATE INDEX IF NOT EXISTS "data_migration_logs_batch_idx" ON "data_migration_logs" USING btree ("batch_id");
CREATE INDEX IF NOT EXISTS "data_migration_logs_legacy_record_idx" ON "data_migration_logs" USING btree ("legacy_source","legacy_record_type","legacy_record_id");
CREATE INDEX IF NOT EXISTS "data_migration_logs_family_created_at_idx" ON "data_migration_logs" USING btree ("family_id","created_at");

ALTER TABLE "blood_pressure_records" ADD COLUMN IF NOT EXISTS "legacy_source" text;
ALTER TABLE "blood_pressure_records" ADD COLUMN IF NOT EXISTS "legacy_user_key" text;
ALTER TABLE "blood_pressure_records" ADD COLUMN IF NOT EXISTS "legacy_record_id" text;
ALTER TABLE "blood_pressure_records" ADD COLUMN IF NOT EXISTS "migration_batch_id" uuid;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "legacy_source" text;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "legacy_user_key" text;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "legacy_record_id" text;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "migration_batch_id" uuid;
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "legacy_source" text;
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "legacy_user_key" text;
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "legacy_record_id" text;
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "migration_batch_id" uuid;
ALTER TABLE "abnormal_events" ADD COLUMN IF NOT EXISTS "legacy_source" text;
ALTER TABLE "abnormal_events" ADD COLUMN IF NOT EXISTS "legacy_user_key" text;
ALTER TABLE "abnormal_events" ADD COLUMN IF NOT EXISTS "legacy_record_id" text;
ALTER TABLE "abnormal_events" ADD COLUMN IF NOT EXISTS "migration_batch_id" uuid;
ALTER TABLE "health_reports" ADD COLUMN IF NOT EXISTS "legacy_source" text;
ALTER TABLE "health_reports" ADD COLUMN IF NOT EXISTS "legacy_user_key" text;
ALTER TABLE "health_reports" ADD COLUMN IF NOT EXISTS "legacy_record_id" text;
ALTER TABLE "health_reports" ADD COLUMN IF NOT EXISTS "migration_batch_id" uuid;

DO $$ BEGIN
 ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "blood_pressure_records_migration_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("migration_batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "medications" ADD CONSTRAINT "medications_migration_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("migration_batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reminders" ADD CONSTRAINT "reminders_migration_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("migration_batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_migration_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("migration_batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_migration_batch_id_data_migration_batches_id_fk" FOREIGN KEY ("migration_batch_id") REFERENCES "public"."data_migration_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "bp_records_legacy_record_idx" ON "blood_pressure_records" USING btree ("legacy_source","legacy_record_id");
CREATE INDEX IF NOT EXISTS "medications_legacy_record_idx" ON "medications" USING btree ("legacy_source","legacy_record_id");
CREATE INDEX IF NOT EXISTS "reminders_legacy_record_idx" ON "reminders" USING btree ("legacy_source","legacy_record_id");
CREATE INDEX IF NOT EXISTS "abnormal_events_legacy_record_idx" ON "abnormal_events" USING btree ("legacy_source","legacy_record_id");
CREATE INDEX IF NOT EXISTS "health_reports_legacy_record_idx" ON "health_reports" USING btree ("legacy_source","legacy_record_id");
