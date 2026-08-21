const db = require('../config/db');

// Headcounts by role, plus how many customers are currently deactivated.
async function getUserCounts(gymId) {
  const { rows } = await db.query(
    `SELECT role,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_active = false)::int AS inactive
     FROM users
     WHERE gym_id = $1
     GROUP BY role`,
    [gymId]
  );
  const byRole = { admin: 0, receptionist: 0, trainer: 0, customer: 0 };
  let inactiveCustomers = 0;
  for (const row of rows) {
    byRole[row.role] = row.total;
    if (row.role === 'customer') inactiveCustomers = row.inactive;
  }
  return { ...byRole, inactiveCustomers };
}

// Breakdown of every customer's membership by computed status
// (active / expiring_soon / expired / frozen / cancelled / no_membership).
async function getMembershipBreakdown(gymId) {
  const { rows } = await db.query(
    `SELECT status, COUNT(*)::int AS count
     FROM (
       SELECT
          CASE
            WHEN m.id IS NULL THEN 'no_membership'
            WHEN m.status = 'cancelled' THEN 'cancelled'
            WHEN m.status = 'frozen' THEN 'frozen'
            WHEN m.end_date < CURRENT_DATE THEN 'expired'
            WHEN m.end_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'expiring_soon'
            ELSE 'active'
          END AS status
       FROM users u
       LEFT JOIN LATERAL (
         SELECT * FROM memberships WHERE user_id = u.id ORDER BY end_date DESC LIMIT 1
       ) m ON true
       WHERE u.gym_id = $1 AND u.role = 'customer'
     ) sub
     GROUP BY status`,
    [gymId]
  );
  const breakdown = { active: 0, expiring_soon: 0, expired: 0, frozen: 0, cancelled: 0, no_membership: 0 };
  for (const row of rows) breakdown[row.status] = row.count;
  return breakdown;
}

// Members whose membership expires within the next 7 days — a quick
// follow-up/renewal-nudge list for the front desk.
async function getExpiringSoon(gymId, days = 7, limit = 8) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, m.end_date, p.name AS plan_name
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     JOIN membership_plans p ON p.id = m.plan_id
     WHERE u.gym_id = $1
       AND m.status = 'active'
       AND m.end_date >= CURRENT_DATE
       AND m.end_date <= CURRENT_DATE + ($2 || ' days')::interval
     ORDER BY m.end_date ASC
     LIMIT $3`,
    [gymId, days, limit]
  );
  return rows;
}

// Revenue from successful payments — this month and all-time.
async function getRevenue(gymId) {
  const { rows } = await db.query(
    `SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE date_trunc('month', pay.created_at) = date_trunc('month', CURRENT_DATE)
        ), 0)::float AS this_month,
        COALESCE(SUM(amount), 0)::float AS all_time
     FROM payments pay
     JOIN users u ON u.id = pay.user_id
     WHERE u.gym_id = $1 AND pay.status = 'success'`,
    [gymId]
  );
  return rows[0];
}

// Today's check-in count for the gym.
async function getAttendanceToday(gymId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE u.gym_id = $1 AND a.checkin_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
    [gymId]
  );
  return rows[0].count;
}

// Attendance check-ins per day for the last N days — feeds a trend chart.
async function getAttendanceTrend(gymId, days = 14) {
  const { rows } = await db.query(
    `SELECT day, COUNT(*)::int AS count
     FROM (
       SELECT date_trunc('day', a.checked_in_at)::date AS day
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE u.gym_id = $1 AND a.checked_in_at >= NOW() - ($2 || ' days')::interval
     ) sub
     GROUP BY day
     ORDER BY day ASC`,
    [gymId, days]
  );
  return rows;
}

// Equipment needing attention (anything not "operational").
async function getEquipmentIssues(gymId) {
  const { rows } = await db.query(
    `SELECT id, name, status FROM equipment WHERE gym_id = $1 AND status <> 'operational' ORDER BY name ASC`,
    [gymId]
  );
  return rows;
}

// Most recently registered members — a quick "who's new" glance.
async function getRecentSignups(gymId, limit = 5) {
  const { rows } = await db.query(
    `SELECT id, name, email, created_at
     FROM users
     WHERE gym_id = $1 AND role = 'customer'
     ORDER BY created_at DESC
     LIMIT $2`,
    [gymId, limit]
  );
  return rows;
}

module.exports = {
  getUserCounts,
  getMembershipBreakdown,
  getExpiringSoon,
  getRevenue,
  getAttendanceToday,
  getAttendanceTrend,
  getEquipmentIssues,
  getRecentSignups,
};
