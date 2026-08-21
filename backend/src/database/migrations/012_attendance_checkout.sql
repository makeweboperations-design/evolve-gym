-- Attendance flow overhaul: member self check-in via the gym's front-desk
-- QR code, manual check-out (with an auto-checkout safety net at closing
-- time), and receptionist-assisted check-in/out for members without a phone.

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_method VARCHAR(20);

-- Widen the allowed check-in methods to include self-service QR scans and
-- receptionist-assisted entries (keeping the old values for any existing
-- rows). Looks up the existing CHECK constraint by column rather than
-- assuming its auto-generated name, so this can't silently no-op if the
-- name ever differs from Postgres's default convention.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'attendance' AND c.contype = 'c' AND a.attname = 'method'
  LOOP
    EXECUTE format('ALTER TABLE attendance DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE attendance ADD CONSTRAINT attendance_method_check
  CHECK (method IN ('qr', 'manual', 'rfid', 'self', 'receptionist'));

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_checkout_method_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_checkout_method_check
  CHECK (checkout_method IS NULL OR checkout_method IN ('self', 'receptionist', 'auto'));

-- Enforces "check in only once a day" at the database level, not just in
-- application code — closes the race-condition window a plain app-side
-- check would leave open. This needs its own plain DATE column rather
-- than indexing checked_in_at::date directly: that cast depends on the
-- session's timezone setting, so Postgres won't allow it inside an index
-- (it can't guarantee the same input always produces the same output).
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_date DATE DEFAULT CURRENT_DATE;
UPDATE attendance SET checkin_date = checked_in_at::date WHERE checkin_date IS NULL;
ALTER TABLE attendance ALTER COLUMN checkin_date SET NOT NULL;

-- Existing test/leftover data may have more than one check-in for the same
-- member on the same day (the old system had no such restriction). Keep
-- only the earliest row per (user_id, checkin_date) — preferring the one
-- that already has a checkout recorded, since that's the most complete
-- record — and drop the rest, so the unique index below can actually be
-- created.
DELETE FROM attendance a
USING attendance b
WHERE a.user_id = b.user_id
  AND a.checkin_date = b.checkin_date
  AND (
    (a.checked_out_at IS NULL AND b.checked_out_at IS NOT NULL)
    OR (
      (a.checked_out_at IS NULL) = (b.checked_out_at IS NULL)
      AND (a.checked_in_at, a.id) > (b.checked_in_at, b.id)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_checkin_date
  ON attendance(user_id, checkin_date);
