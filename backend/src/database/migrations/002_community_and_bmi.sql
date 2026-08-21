-- Migration: Community feature (posts + shared chat + auto birthday posts)
-- and public BMI calculator logging.
-- Run this once against your existing database (Supabase SQL editor works fine).

-- 1. Birthdays need a date of birth on the user record.
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Community feed posts (progress updates, general posts).
--    Birthday posts are NOT stored here — they're generated on the fly from
--    date_of_birth so you never have stale/duplicate birthday posts to clean up.
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'progress')),
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_gym_id ON community_posts(gym_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- 3. One shared group chat room per gym.
CREATE TABLE IF NOT EXISTS community_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_messages_gym_id ON community_messages(gym_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON community_messages(created_at);

-- 4. BMI calculator results. user_id is nullable so visitors (not logged in)
--    can use the calculator too — their result just isn't saved anywhere lasting.
CREATE TABLE IF NOT EXISTS bmi_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    height_cm NUMERIC(5,1) NOT NULL,
    weight_kg NUMERIC(5,1) NOT NULL,
    bmi NUMERIC(4,1) NOT NULL,
    category VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bmi_logs_user_id ON bmi_logs(user_id);
