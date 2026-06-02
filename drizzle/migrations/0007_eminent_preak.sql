CREATE TABLE "companion_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"elder_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companion_messages" ADD CONSTRAINT "companion_messages_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companion_messages" ADD CONSTRAINT "companion_messages_elder_id_elders_id_fk" FOREIGN KEY ("elder_id") REFERENCES "public"."elders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companion_messages" ADD CONSTRAINT "companion_messages_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companion_messages_family_id_idx" ON "companion_messages" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "companion_messages_elder_id_idx" ON "companion_messages" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "companion_messages_created_at_idx" ON "companion_messages" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "companion_messages" ADD CONSTRAINT "companion_messages_role_check" CHECK ("role" IN ('user','assistant'));--> statement-breakpoint
ALTER TABLE "companion_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Family members can read companion messages" ON "companion_messages" FOR SELECT TO authenticated USING (public.is_active_family_member("family_id"));--> statement-breakpoint
CREATE POLICY "Family members can create companion messages" ON "companion_messages" FOR INSERT TO authenticated WITH CHECK (public.has_family_role("family_id", ARRAY['owner','admin','member']));
