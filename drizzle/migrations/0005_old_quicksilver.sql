CREATE TABLE "health_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"period_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"stats" jsonb NOT NULL,
	"generated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_generated_by_profiles_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_reports_family_id_idx" ON "health_reports" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "health_reports_elder_id_idx" ON "health_reports" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "health_reports_period_idx" ON "health_reports" USING btree ("period_type","period_start","period_end");--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_period_type_check" CHECK ("period_type" IN ('weekly','monthly'));--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_period_range_check" CHECK ("period_start" <= "period_end");--> statement-breakpoint
ALTER TABLE "health_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Family members can read health reports" ON "health_reports" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create health reports" ON "health_reports" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));--> statement-breakpoint
CREATE POLICY "Family admins can delete health reports" ON "health_reports" FOR DELETE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin']));
