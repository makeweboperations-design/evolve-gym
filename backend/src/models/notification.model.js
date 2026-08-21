const db = require('../config/db');

async function create({ userId, type, channel, message }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, channel, message, sent_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [userId, type, channel, message]
  );
  return rows[0];
}

// Prevents sending the same reminder/milestone notification twice in the
// same (gym-local) day — checks if a notification of this type already
// went out today. Pinned to the gym's real timezone rather than the DB
// session's default (usually UTC), for the same reason the attendance
// day-boundary logic is — see attendance.model.js for the fuller
// explanation.
async function existsToday(userId, type) {
  const { rows } = await db.query(
    `SELECT id FROM notifications
     WHERE user_id = $1 AND type = $2
       AND (sent_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
     LIMIT 1`,
    [userId, type]
  );
  return rows.length > 0;
}

async function listByUser(userId, limit = 30) {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function markRead(id, userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
}

async function unreadCount(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rows[0].count;
}

// Like existsToday, but with no date filter at all — for notification
// types that already encode their own dedup window in the type string
// itself (e.g. a specific ISO week), so "has this exact type ever been
// sent" is the correct check rather than "sent today."
async function existsEver(userId, type) {
  const { rows } = await db.query(
    `SELECT id FROM notifications WHERE user_id = $1 AND type = $2 LIMIT 1`,
    [userId, type]
  );
  return rows.length > 0;
}

module.exports = { create, existsToday, existsEver, listByUser, markRead, unreadCount };
