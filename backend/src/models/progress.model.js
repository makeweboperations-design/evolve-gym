const db = require('../config/db');

// One row per user per day — logging again for a date that already has an
// entry updates it (upsert), so the calendar always shows one entry per day.
async function upsertLog({
  userId, gymId, logDate, weightKg, notes, photoUrl,
  dietNotes, dietChecklist, workoutNotes, workoutChecklist, waterMl, mood,
  waistCm, chestCm, armsCm, hipsCm,
}) {
  const { rows } = await db.query(
    `INSERT INTO progress_logs (
       user_id, gym_id, log_date, weight_kg, notes, photo_url,
       diet_notes, diet_checklist, workout_notes, workout_checklist, water_ml, mood,
       waist_cm, chest_cm, arms_cm, hips_cm
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (user_id, log_date)
     DO UPDATE SET
       weight_kg = COALESCE($4, progress_logs.weight_kg),
       notes = COALESCE($5, progress_logs.notes),
       photo_url = COALESCE($6, progress_logs.photo_url),
       diet_notes = COALESCE($7, progress_logs.diet_notes),
       diet_checklist = COALESCE($8, progress_logs.diet_checklist),
       workout_notes = COALESCE($9, progress_logs.workout_notes),
       workout_checklist = COALESCE($10, progress_logs.workout_checklist),
       water_ml = COALESCE($11, progress_logs.water_ml),
       mood = COALESCE($12, progress_logs.mood),
       waist_cm = COALESCE($13, progress_logs.waist_cm),
       chest_cm = COALESCE($14, progress_logs.chest_cm),
       arms_cm = COALESCE($15, progress_logs.arms_cm),
       hips_cm = COALESCE($16, progress_logs.hips_cm),
       updated_at = NOW()
     RETURNING *`,
    [
      userId, gymId, logDate, weightKg ?? null, notes ?? null, photoUrl ?? null,
      dietNotes ?? null,
      dietChecklist !== undefined ? JSON.stringify(dietChecklist) : null,
      workoutNotes ?? null,
      workoutChecklist !== undefined ? JSON.stringify(workoutChecklist) : null,
      waterMl ?? null,
      mood ?? null,
      waistCm ?? null,
      chestCm ?? null,
      armsCm ?? null,
      hipsCm ?? null,
    ]
  );
  return rows[0];
}

// Returns every logged day within [startDate, endDate] — used to render a
// month at a time in the calendar.
async function listInRange(userId, startDate, endDate) {
  const { rows } = await db.query(
    `SELECT * FROM progress_logs
     WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
     ORDER BY log_date ASC`,
    [userId, startDate, endDate]
  );
  return rows;
}

async function getByDate(userId, logDate) {
  const { rows } = await db.query(
    `SELECT * FROM progress_logs WHERE user_id = $1 AND log_date = $2`,
    [userId, logDate]
  );
  return rows[0] || null;
}

// Most recently logged day that actually has a weight entry — used to
// auto-calculate BMI without a full history fetch.
async function getLatestWeighIn(userId) {
  const { rows } = await db.query(
    `SELECT log_date, weight_kg FROM progress_logs
     WHERE user_id = $1 AND weight_kg IS NOT NULL
     ORDER BY log_date DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function deleteByDate(userId, logDate) {
  const { rows } = await db.query(
    `DELETE FROM progress_logs WHERE user_id = $1 AND log_date = $2 RETURNING id`,
    [userId, logDate]
  );
  return rows[0] || null;
}

// --- Goal (one per member — set it, and it's what the progress bar tracks) ---

async function getGoal(userId) {
  const { rows } = await db.query(`SELECT * FROM progress_goals WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function upsertGoal({ userId, goalType, startingWeightKg, targetWeightKg, targetDate }) {
  const { rows } = await db.query(
    `INSERT INTO progress_goals (user_id, goal_type, starting_weight_kg, target_weight_kg, target_date)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       goal_type = $2,
       starting_weight_kg = $3,
       target_weight_kg = $4,
       target_date = $5,
       updated_at = NOW()
     RETURNING *`,
    [userId, goalType, startingWeightKg ?? null, targetWeightKg ?? null, targetDate ?? null]
  );
  return rows[0];
}

async function deleteGoal(userId) {
  await db.query(`DELETE FROM progress_goals WHERE user_id = $1`, [userId]);
}

// --- Records / milestones ---------------------------------------------

// Lowest/highest weight ever logged, plus total days logged and the first
// ever log date — the raw material for the "Personal records" card.
async function getWeightStats(userId) {
  const { rows } = await db.query(
    `SELECT
        MIN(weight_kg)::float AS lowest,
        MAX(weight_kg)::float AS highest,
        COUNT(*) FILTER (WHERE weight_kg IS NOT NULL)::int AS weigh_ins,
        (SELECT COUNT(*) FROM progress_logs WHERE user_id = $1)::int AS total_days_logged,
        (SELECT MIN(log_date) FROM progress_logs WHERE user_id = $1) AS first_log_date,
        EXISTS(
          SELECT 1 FROM progress_logs
          WHERE user_id = $1 AND (waist_cm IS NOT NULL OR chest_cm IS NOT NULL OR arms_cm IS NOT NULL OR hips_cm IS NOT NULL)
        ) AS has_measurement
     FROM progress_logs
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

// Most recent day with at least one body measurement filled in — powers
// the "current measurements" summary and lets a member see their latest
// numbers without hunting through the calendar.
async function getLatestMeasurements(userId) {
  const { rows } = await db.query(
    `SELECT log_date, waist_cm, chest_cm, arms_cm, hips_cm
     FROM progress_logs
     WHERE user_id = $1 AND (waist_cm IS NOT NULL OR chest_cm IS NOT NULL OR arms_cm IS NOT NULL OR hips_cm IS NOT NULL)
     ORDER BY log_date DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// Longest-ever run of consecutive logged days, computed with the classic
// "gaps and islands" trick: subtract a running row number (in days) from
// each date — consecutive dates land on the same resulting value, so
// grouping by that value and taking the biggest group size gives the
// longest streak, all in one query.
async function getLongestStreak(userId) {
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(streak_len), 0)::int AS longest
     FROM (
       SELECT COUNT(*) AS streak_len
       FROM (
         SELECT log_date,
                log_date - (ROW_NUMBER() OVER (ORDER BY log_date))::int * INTERVAL '1 day' AS grp
         FROM progress_logs
         WHERE user_id = $1
       ) dated
       GROUP BY grp
     ) islands`,
    [userId]
  );
  return rows[0].longest;
}

// Current streak, counting backward from today (or yesterday, if today
// hasn't been logged yet — a day isn't "broken" until it's actually over).
async function getCurrentStreak(userId) {
  const { rows } = await db.query(
    `SELECT log_date FROM progress_logs WHERE user_id = $1 ORDER BY log_date DESC LIMIT 400`,
    [userId]
  );
  const logged = new Set(rows.map((r) => r.log_date.toISOString().slice(0, 10)));

  const toKey = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let cursor = new Date(today);
  if (!logged.has(toKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1); // today not logged yet — start counting from yesterday
  }

  let streak = 0;
  while (logged.has(toKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function listLoggedDatesInRange(userId, startDate, endDate) {
  const { rows } = await db.query(
    `SELECT log_date FROM progress_logs WHERE user_id = $1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date ASC`,
    [userId, startDate, endDate]
  );
  return rows.map((r) => r.log_date);
}

// Richer version for the heatmap: instead of a flat logged/not-logged
// boolean, scores how "complete" each day's entry was — did they log
// weight, a diet checklist, a workout checklist? More filled in means a
// darker cell, same idea as GitHub's contribution graph but based on
// actual effort that day rather than just "a row exists."
async function listCompletionInRange(userId, startDate, endDate) {
  const { rows } = await db.query(
    `SELECT log_date,
            (CASE WHEN weight_kg IS NOT NULL THEN 1 ELSE 0 END
             + CASE WHEN jsonb_array_length(COALESCE(diet_checklist, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END
             + CASE WHEN jsonb_array_length(COALESCE(workout_checklist, '[]'::jsonb)) > 0 THEN 1 ELSE 0 END
            )::int AS filled_count
     FROM progress_logs
     WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
     ORDER BY log_date ASC`,
    [userId, startDate, endDate]
  );
  // filled_count 0 still means "logged something" (level 1) since a row
  // exists at all — e.g. a bare check-in-only entry. 1/2/3 filled fields
  // map to levels 2/3/4.
  return rows.map((r) => ({
    date: r.log_date,
    level: r.filled_count === 0 ? 1 : r.filled_count + 1,
  }));
}

// --- Water intake goal (one per member, editable any time) -------------

async function getWaterGoal(userId) {
  const { rows } = await db.query(`SELECT * FROM progress_water_goals WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function upsertWaterGoal(userId, dailyGoalMl) {
  const { rows } = await db.query(
    `INSERT INTO progress_water_goals (user_id, daily_goal_ml)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET daily_goal_ml = $2, updated_at = NOW()
     RETURNING *`,
    [userId, dailyGoalMl]
  );
  return rows[0];
}

module.exports = {
  upsertLog,
  listInRange,
  getByDate,
  getLatestWeighIn,
  listLoggedDatesInRange,
  listCompletionInRange,
  deleteByDate,
  getGoal,
  upsertGoal,
  deleteGoal,
  getWeightStats,
  getLatestMeasurements,
  getLongestStreak,
  getCurrentStreak,
  getWaterGoal,
  upsertWaterGoal,
};
