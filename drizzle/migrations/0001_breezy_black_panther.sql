CREATE TABLE "blood_pressure_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"period" text NOT NULL,
	"systolic" integer NOT NULL,
	"diastolic" integer NOT NULL,
	"pulse" integer NOT NULL,
	"image_key" text,
	"source" text DEFAULT 'web' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "blood_pressure_records_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "blood_pressure_records_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "blood_pressure_records_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bp_records_family_id_idx" ON "blood_pressure_records" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "bp_records_elder_id_idx" ON "blood_pressure_records" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "bp_records_measured_at_idx" ON "blood_pressure_records" USING btree ("measured_at");--> statement-breakpoint
CREATE INDEX "bp_records_elder_measured_at_idx" ON "blood_pressure_records" USING btree ("elder_id","measured_at");--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_period_check" CHECK ("period" IN ('morning','noon','evening','night'));--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_status_check" CHECK ("status" IN ('confirmed','pending'));--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_source_check" CHECK ("source" IN ('web','manual','ocr','excel','wechat'));--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_systolic_check" CHECK ("systolic" BETWEEN 80 AND 220);--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_diastolic_check" CHECK ("diastolic" BETWEEN 40 AND 140);--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_pulse_check" CHECK ("pulse" BETWEEN 35 AND 200);--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_pressure_order_check" CHECK ("systolic" > "diastolic");--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Family members can read blood pressure records" ON "blood_pressure_records" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create blood pressure records" ON "blood_pressure_records" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family members can update blood pressure records" ON "blood_pressure_records" FOR UPDATE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin','member'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family admins can delete blood pressure records" ON "blood_pressure_records" FOR DELETE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin']));
