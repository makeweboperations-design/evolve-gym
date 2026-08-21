const db = require('../config/db');

// All "today"/"current time" comparisons in this file are pinned to the
// gym's real-world timezone rather than whatever timezone the database
// session defaults to (Supabase/most hosted Postgres defaults to UTC).
// Without this, a member checking in late in the evening (gym-local time)
// could get attributed to the wrong calendar day, and the 10:30 PM closing
// cutoff below would fire at the wrong real-world moment — which is
// exactly what caused the auto-checkout bug this file now fixes.
const GYM_TZ = 'Asia/Kolkata';

async function checkIn(userId, method) {
  const { rows } = await db.query(
    `INSERT INTO attendance (user_id, checked_in_at, checkin_date, method)
     VALUES ($1, NOW(), (NOW() AT TIME ZONE $2)::date, $3) RETURNING *`,
    [userId, GYM_TZ, method]
  );
  return rows[0];
}

// Prevents double check-in within the same day for the same member.
async function hasCheckedInToday(userId) {
  const { rows } = await db.query(
    `SELECT id FROM attendance WHERE user_id = $1 AND checkin_date = (NOW() AT TIME ZONE $2)::date LIMIT 1`,
    [userId, GYM_TZ]
  );
  return rows.length > 0;
}

// Today's attendance row for a member, if any — used to know whether
// they're currently checked in, already checked out, or haven't shown up.
async function getTodayRecord(userId) {
  const { rows } = await db.query(
    `SELECT * FROM attendance WHERE user_id = $1 AND checkin_date = (NOW() AT TIME ZONE $2)::date LIMIT 1`,
    [userId, GYM_TZ]
  );
  return rows[0] || null;
}

// Checks out whoever's open attendance record exists for today. No-ops
// (returns null) if they're not checked in or already checked out —
// callers use that to enforce "check out only once a day."
async function checkOut(userId, method) {
  const { rows } = await db.query(
    `UPDATE attendance
     SET checked_out_at = NOW(), checkout_method = $2
     WHERE user_id = $1 AND checkin_date = (NOW() AT TIME ZONE $3)::date AND checked_out_at IS NULL
     RETURNING *`,
    [userId, method, GYM_TZ]
  );
  return rows[0] || null;
}

async function listByUser(userId, limit = 30) {
  const { rows } = await db.query(
    `SELECT * FROM attendance WHERE user_id = $1 ORDER BY checked_in_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// Today's check-ins for the whole gym (receptionist/admin real-time view),
// most recent first.
async function listTodayForGym(gymId) {
  const { rows } = await db.query(
    `SELECT a.*, u.name, u.email
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE u.gym_id = $1 AND a.checkin_date = (NOW() AT TIME ZONE $2)::date
     ORDER BY a.checked_in_at DESC`,
    [gymId, GYM_TZ]
  );
  return rows;
}

// How many members are physically inside right now (checked in today,
// not yet checked out) — feeds the admin overview dashboard.
async function getActiveCountForGym(gymId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE u.gym_id = $1 AND a.checkin_date = (NOW() AT TIME ZONE $2)::date AND a.checked_out_at IS NULL`,
    [gymId, GYM_TZ]
  );
  return rows[0].count;
}

// Every attendance record still open (no checkout yet), regardless of
// date — used by the nightly auto-checkout job. Scoping by "regardless of
// date" rather than strictly today makes the job self-healing: if it ever
// misses a night (server was asleep, deploy in progress, etc.), it still
// cleans up any record that was left open.
async function listOpenRecords() {
  const { rows } = await db.query(
    `SELECT a.*, u.name, u.email
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE a.checked_out_at IS NULL`
  );
  return rows;
}

async function autoCheckOut(recordId) {
  const { rows } = await db.query(
    `UPDATE attendance SET checked_out_at = NOW(), checkout_method = 'auto'
     WHERE id = $1 RETURNING *`,
    [recordId]
  );
  return rows[0];
}

// Self-healing catch-up: auto-checks-out anyone whose record is from a
// past (gym-local) day, or from today but past the 10:30 PM closing
// cutoff — run at the top of every attendance request (not just the
// nightly cron job). This is the real fix for cron reliability on a
// free-tier host that spins down when idle: node-cron only fires if the
// process happens to be awake at exactly 10:30 PM, which isn't
// guaranteed. Piggybacking this check on ordinary traffic means the very
// next page load/API call after closing time — from anyone, member or
// staff — cleans up any record that was left open, regardless of
// whether the cron actually ran.
async function catchUpAutoCheckouts() {
  const { rows } = await db.query(
    `UPDATE attendance a
     SET checked_out_at = NOW(), checkout_method = 'auto'
     WHERE a.checked_out_at IS NULL
       AND (
         a.checkin_date < (NOW() AT TIME ZONE $1)::date
         OR (a.checkin_date = (NOW() AT TIME ZONE $1)::date AND (NOW() AT TIME ZONE $1)::time >= TIME '22:30')
       )
     RETURNING a.id, a.user_id`,
    [GYM_TZ]
  );
  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const { rows: users } = await db.query(
    `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
    [userIds]
  );
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, user: byId.get(r.user_id) }));
}

module.exports = {
  checkIn,
  hasCheckedInToday,
  getTodayRecord,
  checkOut,
  listByUser,
  listTodayForGym,
  getActiveCountForGym,
  listOpenRecords,
  autoCheckOut,
  catchUpAutoCheckouts,
};
