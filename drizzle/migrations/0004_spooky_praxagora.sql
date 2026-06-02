CREATE TABLE "abnormal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"title" text NOT NULL,
	"event_type" text DEFAULT 'other' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"description" text,
	"related_blood_pressure_record_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_related_blood_pressure_record_id_blood_pressure_records_id_fk" FOREIGN KEY ("related_blood_pressure_record_id") REFERENCES "public"."blood_pressure_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abnormal_events_family_id_idx" ON "abnormal_events" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "abnormal_events_elder_id_idx" ON "abnormal_events" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "abnormal_events_occurred_at_idx" ON "abnormal_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "abnormal_events_status_idx" ON "abnormal_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "abnormal_events_severity_idx" ON "abnormal_events" USING btree ("severity");--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_event_type_check" CHECK ("event_type" IN ('blood_pressure','medication','fall','symptom','other'));--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_severity_check" CHECK ("severity" IN ('low','medium','high','critical'));--> statement-breakpoint
ALTER TABLE "abnormal_events" ADD CONSTRAINT "abnormal_events_status_check" CHECK ("status" IN ('open','monitoring','resolved'));--> statement-breakpoint
ALTER TABLE "abnormal_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Family members can read abnormal events" ON "abnormal_events" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create abnormal events" ON "abnormal_events" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family members can update abnormal events" ON "abnormal_events" FOR UPDATE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin','member'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family admins can delete abnormal events" ON "abnormal_events" FOR DELETE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin']));
