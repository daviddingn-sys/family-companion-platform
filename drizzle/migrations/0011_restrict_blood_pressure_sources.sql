UPDATE "blood_pressure_records" SET "source" = 'web' WHERE "source" = 'wechat';--> statement-breakpoint
ALTER TABLE "blood_pressure_records" DROP CONSTRAINT IF EXISTS "bp_records_source_check";--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_source_check" CHECK ("source" IN ('web','manual','ocr','excel'));
