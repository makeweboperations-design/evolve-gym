-- One active goal per member: what they're working toward (lose/gain/
-- maintain weight), their target, and where they started — powers the
-- progress-toward-goal bar on the Progress Tracker dashboard.
CREATE TABLE IF NOT EXISTS progress_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('lose', 'gain', 'maintain')),
    starting_weight_kg NUMERIC(5,2),
    target_weight_kg NUMERIC(5,2),
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
