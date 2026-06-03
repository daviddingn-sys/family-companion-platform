CREATE INDEX IF NOT EXISTS "elders_family_created_at_idx" ON "elders" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "families_owner_user_id_idx" ON "families" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_members_family_id_idx" ON "family_members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_members_user_status_idx" ON "family_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_members_invited_email_status_idx" ON "family_members" USING btree ("invited_email","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_members_invited_phone_status_idx" ON "family_members" USING btree ("invited_phone","status");
