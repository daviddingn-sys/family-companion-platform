CREATE TABLE IF NOT EXISTS "data_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "family_id" uuid,
  "request_type" text NOT NULL,
  "status" text DEFAULT 'submitted' NOT NULL,
  "source" text DEFAULT 'web' NOT NULL,
  "note" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "data_requests_user_created_at_idx" ON "data_requests" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "data_requests_family_created_at_idx" ON "data_requests" USING btree ("family_id","created_at");
CREATE INDEX IF NOT EXISTS "data_requests_status_idx" ON "data_requests" USING btree ("status");
