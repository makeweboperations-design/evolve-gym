const db = require('../config/db');

async function saveResult({ userId, heightCm, weightKg, bmi, category }) {
  const { rows } = await db.query(
    `INSERT INTO bmi_logs (user_id, height_cm, weight_kg, bmi, category)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, heightCm, weightKg, bmi, category]
  );
  return rows[0];
}

async function listByUser(userId, limit = 20) {
  const { rows } = await db.query(
    `SELECT * FROM bmi_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// Most recently saved height — lets the progress tracker auto-calculate BMI
// from a member's daily-logged weight without asking them to re-enter height.
async function getLatestHeight(userId) {
  const { rows } = await db.query(
    `SELECT height_cm FROM bmi_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.height_cm ?? null;
}

module.exports = { saveResult, listByUser, getLatestHeight };
