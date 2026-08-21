-- Water intake tracking: a daily amount (ml) on each progress log, and a
-- single editable daily goal per member.

ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS water_ml INTEGER;

CREATE TABLE IF NOT EXISTS progress_water_goals (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_goal_ml INTEGER NOT NULL DEFAULT 2500 CHECK (daily_goal_ml > 0 AND daily_goal_ml <= 10000),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
