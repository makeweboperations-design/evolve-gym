-- Migration: allow staff (admin/receptionist) notice posts in the community feed.

ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('general', 'progress', 'birthday', 'notice'));
