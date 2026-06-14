ALTER TABLE "blood_pressure_records" DROP CONSTRAINT IF EXISTS "bp_records_source_check";
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "bp_records_source_check" CHECK ("source" IN ('web','manual','ocr','excel','miniprogram'));
