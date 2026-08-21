-- Migration: allow images in gym chat messages (posts already support image_url).

ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE community_messages ALTER COLUMN content DROP NOT NULL;
