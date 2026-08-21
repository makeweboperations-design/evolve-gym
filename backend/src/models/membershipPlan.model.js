const db = require('../config/db');

async function listByGym(gymId) {
  const { rows } = await db.query(
    `SELECT * FROM membership_plans WHERE gym_id = $1 ORDER BY price ASC`,
    [gymId]
  );
  return rows;
}

async function create({ gymId, name, durationDays, price, description }) {
  const { rows } = await db.query(
    `INSERT INTO membership_plans (gym_id, name, duration_days, price, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [gymId, name, durationDays, price, description || null]
  );
  return rows[0];
}

async function update(id, gymId, fields) {
  const { rows } = await db.query(
    `UPDATE membership_plans
     SET name = COALESCE($3, name),
         duration_days = COALESCE($4, duration_days),
         price = COALESCE($5, price),
         description = COALESCE($6, description),
         is_active = COALESCE($7, is_active)
     WHERE id = $1 AND gym_id = $2
     RETURNING *`,
    [id, gymId, fields.name, fields.durationDays, fields.price, fields.description, fields.isActive]
  );
  return rows[0] || null;
}

async function remove(id, gymId) {
  await db.query(`DELETE FROM membership_plans WHERE id = $1 AND gym_id = $2`, [id, gymId]);
}

module.exports = { listByGym, create, update, remove };
