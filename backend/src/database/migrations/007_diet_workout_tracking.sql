-- Migration: separate diet and workout tracking (notes + a simple checklist)
-- on top of the existing daily weight/photo entry.

ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS diet_notes TEXT;
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS diet_checklist JSONB DEFAULT '[]';
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS workout_notes TEXT;
ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS workout_checklist JSONB DEFAULT '[]';

-- Checklist shape (stored as JSONB array): [{ "text": "Drink 3L water", "done": true }, ...]
