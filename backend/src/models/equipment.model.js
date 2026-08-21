const db = require('../config/db');

async function list(gymId) {
  const { rows } = await db.query(
    `SELECT * FROM equipment WHERE gym_id = $1 ORDER BY name ASC`,
    [gymId]
  );
  return rows;
}

async function getById(id, gymId) {
  const { rows } = await db.query(
    `SELECT * FROM equipment WHERE id = $1 AND gym_id = $2`,
    [id, gymId]
  );
  return rows[0] || null;
}

async function create({ gymId, name, category, status, purchaseDate, lastMaintenanceDate, nextMaintenanceDate, notes }) {
  const { rows } = await db.query(
    `INSERT INTO equipment (gym_id, name, category, status, purchase_date, last_maintenance_date, next_maintenance_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [gymId, name, category || null, status || 'operational', purchaseDate || null, lastMaintenanceDate || null, nextMaintenanceDate || null, notes || null]
  );
  return rows[0];
}

async function update(id, gymId, fields) {
  const { rows } = await db.query(
    `UPDATE equipment SET
       name = COALESCE($3, name),
       category = COALESCE($4, category),
       status = COALESCE($5, status),
       purchase_date = COALESCE($6, purchase_date),
       last_maintenance_date = COALESCE($7, last_maintenance_date),
       next_maintenance_date = COALESCE($8, next_maintenance_date),
       notes = COALESCE($9, notes),
       updated_at = NOW()
     WHERE id = $1 AND gym_id = $2
     RETURNING *`,
    [
      id, gymId,
      fields.name, fields.category, fields.status,
      fields.purchaseDate, fields.lastMaintenanceDate, fields.nextMaintenanceDate,
      fields.notes,
    ]
  );
  return rows[0] || null;
}

async function remove(id, gymId) {
  const { rows } = await db.query(
    `DELETE FROM equipment WHERE id = $1 AND gym_id = $2 RETURNING id`,
    [id, gymId]
  );
  return rows[0] || null;
}

module.exports = { list, getById, create, update, remove };
