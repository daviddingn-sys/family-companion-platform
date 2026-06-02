CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text,
	"frequency" text,
	"instructions" text,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medications_family_id_idx" ON "medications" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "medications_elder_id_idx" ON "medications" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "medications_status_idx" ON "medications" USING btree ("status");--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_status_check" CHECK ("status" IN ('active','paused','stopped'));--> statement-breakpoint
ALTER TABLE "medications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Family members can read medications" ON "medications" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create medications" ON "medications" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family members can update medications" ON "medications" FOR UPDATE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin','member'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family admins can delete medications" ON "medications" FOR DELETE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin']));
