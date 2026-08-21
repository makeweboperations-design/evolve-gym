-- Migration: birthday posts become real (commentable) rows, plus comments.

-- Allow 'birthday' as a real post type so birthday shout-outs can be commented on.
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('general', 'progress', 'birthday'));

CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
