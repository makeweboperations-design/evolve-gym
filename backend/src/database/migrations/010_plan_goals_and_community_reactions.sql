-- Migration: template-based diet/workout plans + WhatsApp-style community
-- reactions and edit support.

-- 1. Track which generic template (goal) a plan was assigned/started from,
--    and who last touched it (trainer vs. the customer themselves).
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS goal VARCHAR(20)
  CHECK (goal IN ('weight_loss', 'weight_gain', 'maintain', 'custom'));
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id);
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS last_edited_role VARCHAR(20);

ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS goal VARCHAR(20)
  CHECK (goal IN ('weight_loss', 'weight_gain', 'maintain', 'custom'));
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id);
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS last_edited_role VARCHAR(20);

-- 2. Edit support (WhatsApp-style: editable for a short window after sending)
--    for community posts and gym-chat messages.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 3. Emoji reactions, shared by both posts and chat messages via a polymorphic
--    target (no FK on target_id since it can point at either table; rows are
--    cleaned up in application code when the parent post/message is deleted).
CREATE TABLE IF NOT EXISTS community_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'message')),
    target_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_target ON community_reactions(target_type, target_id);
