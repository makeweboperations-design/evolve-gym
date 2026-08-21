-- Optional body measurements (cm) alongside the daily weight log — not
-- everyone weighs daily, but tracking waist/chest/arms/hips over time is
-- often a better progress signal than the scale alone.
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS waist_cm NUMERIC(5,1);
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS chest_cm NUMERIC(5,1);
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS arms_cm NUMERIC(5,1);
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS hips_cm NUMERIC(5,1);
