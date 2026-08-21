-- Quick daily mood/energy check-in (1-5) — a near-zero-effort log a member
-- can tap in a second, another small reason to open the tracker daily.
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS mood SMALLINT CHECK (mood IS NULL OR mood BETWEEN 1 AND 5);
