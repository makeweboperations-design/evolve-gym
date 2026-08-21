const db = require('../config/db');

// Audit logs aren't scoped by gym_id directly (actor_id has no FK), so we join
// through users to keep an admin from seeing another gym's activity.
// `sinceDays` (optional) filters to the last N days — used for the
// 1 day / 3 days / 7 days / 1 month / 1 year filter buttons in the UI.
async function listByGym(gymId, limit = 100, sinceDays = null) {
  const params = [gymId, limit];
  let dateFilter = '';
  if (sinceDays !== null) {
    params.push(sinceDays);
    dateFilter = `AND al.created_at >= NOW() - ($3 || ' days')::interval`;
  }

  const { rows } = await db.query(
    `SELECT al.*, u.name AS actor_name, u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE u.gym_id = $1
     ${dateFilter}
     ORDER BY al.created_at DESC
     LIMIT $2`,
    params
  );
  return rows;
}

module.exports = { listByGym };
