const db = require('../config/db');

// Every member in the gym, with their current (most recent) membership + plan
// joined in, and a computed status flag for renewal tracking.
async function listByGymWithStatus(gymId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (u.id)
        u.id AS user_id, u.name, u.email, u.phone,
        m.id AS membership_id, m.start_date, m.end_date, m.status,
        p.id AS plan_id, p.name AS plan_name, p.duration_days, p.price,
        CASE
          WHEN m.id IS NULL THEN 'no_membership'
          WHEN m.status = 'cancelled' THEN 'cancelled'
          WHEN m.status = 'frozen' THEN 'frozen'
          WHEN m.end_date < CURRENT_DATE THEN 'expired'
          WHEN m.end_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'expiring_soon'
          ELSE 'active'
        END AS computed_status
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN membership_plans p ON p.id = m.plan_id
     WHERE u.gym_id = $1 AND u.role = 'customer'
     ORDER BY u.id, m.end_date DESC NULLS LAST`,
    [gymId]
  );
  return rows;
}

async function create({ userId, planId, startDate, durationDays }) {
  const { rows } = await db.query(
    `INSERT INTO memberships (user_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $3::date + ($4 || ' days')::interval, 'active')
     RETURNING *`,
    [userId, planId, startDate, durationDays]
  );
  return rows[0];
}

// Renewal: extend from today (if already expired) or from the current
// end_date (if renewing early, so no time is lost).
async function renew(membershipId, gymId, durationDays) {
  const { rows } = await db.query(
    `UPDATE memberships m
     SET end_date = GREATEST(m.end_date, CURRENT_DATE) + ($3 || ' days')::interval,
         status = 'active'
     FROM users u
     WHERE m.id = $1 AND m.user_id = u.id AND u.gym_id = $2
     RETURNING m.*`,
    [membershipId, gymId, durationDays]
  );
  return rows[0] || null;
}

async function updateStatus(membershipId, gymId, status) {
  const { rows } = await db.query(
    `UPDATE memberships m
     SET status = $3
     FROM users u
     WHERE m.id = $1 AND m.user_id = u.id AND u.gym_id = $2
     RETURNING m.*`,
    [membershipId, gymId, status]
  );
  return rows[0] || null;
}

async function getForUser(userId) {
  const { rows } = await db.query(
    `SELECT m.id AS membership_id, m.start_date, m.end_date, m.status,
            p.name AS plan_name, p.price, p.duration_days,
            CASE
              WHEN m.status = 'cancelled' THEN 'cancelled'
              WHEN m.status = 'frozen' THEN 'frozen'
              WHEN m.end_date < CURRENT_DATE THEN 'expired'
              WHEN m.end_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'expiring_soon'
              ELSE 'active'
            END AS computed_status
     FROM memberships m
     JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.user_id = $1
     ORDER BY m.end_date DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { listByGymWithStatus, create, renew, updateStatus, getForUser };
