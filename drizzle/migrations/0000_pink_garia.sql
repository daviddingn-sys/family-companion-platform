CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TABLE "elders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"gender" text DEFAULT 'unknown' NOT NULL,
	"birth_date" date,
	"phone" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"address" text,
	"medical_notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid,
	"role" text DEFAULT 'member' NOT NULL,
	"relationship" text,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_email" text,
	"invited_phone" text,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phone" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elders" ADD CONSTRAINT "elders_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elders" ADD CONSTRAINT "elders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_family_user_idx" ON "family_members" USING btree ("family_id","user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "family_members_family_id_idx" ON "family_members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "family_members_user_id_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "elders_family_id_idx" ON "elders" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_role_check" CHECK ("role" IN ('owner','admin','member','viewer'));--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_status_check" CHECK ("status" IN ('active','invited','removed'));--> statement-breakpoint
ALTER TABLE "elders" ADD CONSTRAINT "elders_gender_check" CHECK ("gender" IN ('male','female','other','unknown'));--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "families" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "family_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "elders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_active_family_member(target_family_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE family_id = target_family_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.has_family_role(target_family_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE family_id = target_family_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$$;--> statement-breakpoint
CREATE POLICY "Users can read own profile" ON "profiles" FOR SELECT TO authenticated USING ("id" = auth.uid());--> statement-breakpoint
CREATE POLICY "Users can update own profile" ON "profiles" FOR UPDATE TO authenticated USING ("id" = auth.uid()) WITH CHECK ("id" = auth.uid());--> statement-breakpoint
CREATE POLICY "Family members can read families" ON "families" FOR SELECT TO authenticated USING (public.is_active_family_member("id"));--> statement-breakpoint
CREATE POLICY "Family owners can update families" ON "families" FOR UPDATE TO authenticated USING (public.has_family_role("id", ARRAY['owner','admin'])) WITH CHECK (public.has_family_role("id", ARRAY['owner','admin']));--> statement-breakpoint
CREATE POLICY "Family owners can delete families" ON "families" FOR DELETE TO authenticated USING (public.has_family_role("id", ARRAY['owner']));--> statement-breakpoint
CREATE POLICY "Family members can read members" ON "family_members" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family admins can manage members" ON "family_members" FOR ALL TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin']));--> statement-breakpoint
CREATE POLICY "Family members can read elders" ON "elders" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create elders" ON "elders" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family members can update elders" ON "elders" FOR UPDATE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin','member'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family admins can delete elders" ON "elders" FOR DELETE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin']));
