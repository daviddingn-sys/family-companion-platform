CREATE TABLE IF NOT EXISTS "wechat_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "appid" text NOT NULL,
  "openid" text NOT NULL,
  "unionid" text,
  "nickname" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "operation_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid,
  "family_id" uuid,
  "elder_id" uuid,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "source" text DEFAULT 'web' NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "wechat_identities" ADD CONSTRAINT "wechat_identities_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_actor_user_id_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "wechat_identities_user_id_idx" ON "wechat_identities" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "wechat_identities_unionid_idx" ON "wechat_identities" USING btree ("unionid");
CREATE UNIQUE INDEX IF NOT EXISTS "wechat_identities_appid_openid_idx" ON "wechat_identities" USING btree ("appid","openid");
CREATE INDEX IF NOT EXISTS "operation_logs_actor_created_at_idx" ON "operation_logs" USING btree ("actor_user_id","created_at");
CREATE INDEX IF NOT EXISTS "operation_logs_family_created_at_idx" ON "operation_logs" USING btree ("family_id","created_at");
CREATE INDEX IF NOT EXISTS "operation_logs_resource_idx" ON "operation_logs" USING btree ("resource_type","resource_id");
