const db = require('../config/db');

// --- Posts (progress updates / general posts / birthday shout-outs / notices) ---

async function createPost({ gymId, userId, type, content, imageUrl }) {
  const { rows } = await db.query(
    `INSERT INTO community_posts (gym_id, user_id, type, content, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [gymId, userId, type || 'general', content, imageUrl || null]
  );
  return rows[0];
}

async function listPosts(gymId, limit = 50) {
  const { rows } = await db.query(
    `SELECT p.*, u.name AS user_name, u.profile_photo_url,
            COALESCE(c.comment_count, 0)::int AS comment_count,
            COALESCE(r.reactions, '[]'::json) AS reactions
     FROM community_posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN (
       SELECT post_id, COUNT(*) AS comment_count
       FROM community_comments GROUP BY post_id
     ) c ON c.post_id = p.id
     LEFT JOIN (
       SELECT target_id, json_agg(json_build_object('emoji', emoji, 'count', cnt, 'userIds', user_ids, 'userNames', user_names)) AS reactions
       FROM (
         SELECT cr.target_id, cr.emoji, COUNT(*) AS cnt, array_agg(cr.user_id) AS user_ids, array_agg(u.name) AS user_names
         FROM community_reactions cr
         JOIN users u ON u.id = cr.user_id
         WHERE cr.target_type = 'post'
         GROUP BY cr.target_id, cr.emoji
       ) grouped
       GROUP BY target_id
     ) r ON r.target_id = p.id
     WHERE p.gym_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [gymId, limit]
  );
  return rows;
}

async function getPostById(id) {
  const { rows } = await db.query(`SELECT * FROM community_posts WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updatePostContent(id, content) {
  const { rows } = await db.query(
    `UPDATE community_posts SET content = $2, edited_at = NOW() WHERE id = $1 RETURNING *`,
    [id, content]
  );
  return rows[0] || null;
}

async function deletePost(id) {
  await db.query(`DELETE FROM community_reactions WHERE target_type = 'post' AND target_id = $1`, [id]);
  const { rows } = await db.query(`DELETE FROM community_posts WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// --- Birthdays -------------------------------------------------------------
// Auto-create (once) a real, commentable birthday post for each member whose
// birthday is today — idempotent, so calling this on every feed load never
// creates duplicates for the same person on the same day.

async function ensureTodaysBirthdayPosts(gymId) {
  const { rows: birthdayUsers } = await db.query(
    `SELECT id, name
     FROM users
     WHERE gym_id = $1
       AND date_of_birth IS NOT NULL
       AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)`,
    [gymId]
  );

  for (const person of birthdayUsers) {
    const { rows: existing } = await db.query(
      `SELECT id FROM community_posts
       WHERE gym_id = $1 AND user_id = $2 AND type = 'birthday'
         AND created_at::date = CURRENT_DATE
       LIMIT 1`,
      [gymId, person.id]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO community_posts (gym_id, user_id, type, content)
         VALUES ($1, $2, 'birthday', $3)`,
        [gymId, person.id, `🎉 It's ${person.name}'s birthday today! Wish them well.`]
      );
    }
  }
}

// --- Comments ---------------------------------------------------------------

async function addComment({ postId, userId, content }) {
  const { rows } = await db.query(
    `INSERT INTO community_comments (post_id, user_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [postId, userId, content]
  );
  const { rows: withUser } = await db.query(
    `SELECT c.*, u.name AS user_name, u.profile_photo_url
     FROM community_comments c JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [rows[0].id]
  );
  return withUser[0];
}

async function listComments(postId) {
  const { rows } = await db.query(
    `SELECT c.*, u.name AS user_name, u.profile_photo_url
     FROM community_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

// --- Shared gym chat -------------------------------------------------------

async function createMessage({ gymId, userId, content, imageUrl }) {
  const { rows } = await db.query(
    `INSERT INTO community_messages (gym_id, user_id, content, image_url)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [gymId, userId, content || null, imageUrl || null]
  );
  const { rows: withUser } = await db.query(
    `SELECT m.*, u.name AS user_name, u.profile_photo_url
     FROM community_messages m JOIN users u ON u.id = m.user_id
     WHERE m.id = $1`,
    [rows[0].id]
  );
  return withUser[0];
}

async function listMessages(gymId, limit = 100) {
  const { rows } = await db.query(
    `SELECT m.*, u.name AS user_name, u.profile_photo_url,
            COALESCE(r.reactions, '[]'::json) AS reactions
     FROM community_messages m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN (
       SELECT target_id, json_agg(json_build_object('emoji', emoji, 'count', cnt, 'userIds', user_ids, 'userNames', user_names)) AS reactions
       FROM (
         SELECT cr.target_id, cr.emoji, COUNT(*) AS cnt, array_agg(cr.user_id) AS user_ids, array_agg(u.name) AS user_names
         FROM community_reactions cr
         JOIN users u ON u.id = cr.user_id
         WHERE cr.target_type = 'message'
         GROUP BY cr.target_id, cr.emoji
       ) grouped
       GROUP BY target_id
     ) r ON r.target_id = m.id
     WHERE m.gym_id = $1
     ORDER BY m.created_at ASC
     LIMIT $2`,
    [gymId, limit]
  );
  return rows;
}

async function getMessageById(id) {
  const { rows } = await db.query(`SELECT * FROM community_messages WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateMessageContent(id, content) {
  const { rows } = await db.query(
    `UPDATE community_messages SET content = $2, edited_at = NOW() WHERE id = $1 RETURNING *`,
    [id, content]
  );
  return rows[0] || null;
}

async function deleteMessage(id) {
  await db.query(`DELETE FROM community_reactions WHERE target_type = 'message' AND target_id = $1`, [id]);
  const { rows } = await db.query(`DELETE FROM community_messages WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// --- Reactions ---------------------------------------------------------
// WhatsApp-style: one reaction per user per target. Tapping the same emoji
// again removes it; tapping a different emoji replaces it.

async function toggleReaction({ targetType, targetId, userId, emoji }) {
  const { rows: existing } = await db.query(
    `SELECT id, emoji FROM community_reactions WHERE target_type = $1 AND target_id = $2 AND user_id = $3`,
    [targetType, targetId, userId]
  );

  if (existing[0] && existing[0].emoji === emoji) {
    await db.query(`DELETE FROM community_reactions WHERE id = $1`, [existing[0].id]);
    return { removed: true };
  }

  if (existing[0]) {
    await db.query(`UPDATE community_reactions SET emoji = $2, created_at = NOW() WHERE id = $1`, [existing[0].id, emoji]);
  } else {
    await db.query(
      `INSERT INTO community_reactions (target_type, target_id, user_id, emoji) VALUES ($1, $2, $3, $4)`,
      [targetType, targetId, userId, emoji]
    );
  }
  return { removed: false };
}

async function listReactionsForTarget(targetType, targetId) {
  const { rows } = await db.query(
    `SELECT cr.emoji, COUNT(*)::int AS count, array_agg(cr.user_id) AS "userIds", array_agg(u.name) AS "userNames"
     FROM community_reactions cr
     JOIN users u ON u.id = cr.user_id
     WHERE cr.target_type = $1 AND cr.target_id = $2
     GROUP BY cr.emoji`,
    [targetType, targetId]
  );
  return rows;
}

module.exports = {
  createPost,
  listPosts,
  getPostById,
  updatePostContent,
  deletePost,
  ensureTodaysBirthdayPosts,
  addComment,
  listComments,
  createMessage,
  listMessages,
  getMessageById,
  updateMessageContent,
  deleteMessage,
  toggleReaction,
  listReactionsForTarget,
};
