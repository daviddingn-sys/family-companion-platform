ALTER TABLE "health_reports" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "health_reports" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "health_reports" ADD COLUMN "ai_generated_at" timestamp with time zone;--> statement-breakpoint
CREATE POLICY "Family members can update health reports" ON "health_reports" FOR UPDATE TO authenticated USING (public.has_family_role("family_id", ARRAY['owner','admin','member'])) WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));
