const db = require('../config/db');

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, role, gymId, phone, dateOfBirth, isActive }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role, gym_id, phone, date_of_birth, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING id, name, email, role, gym_id, phone, date_of_birth, is_active, created_at`,
    [name, email, passwordHash, role, gymId, phone, dateOfBirth || null, isActive !== false]
  );
  return rows[0];
}

async function listPendingApproval(gymId, limit = 20) {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, created_at
     FROM users
     WHERE gym_id = $1 AND role = 'customer' AND is_active = FALSE
     ORDER BY created_at ASC
     LIMIT $2`,
    [gymId, limit]
  );
  return rows;
}

async function listAdmins(gymId) {
  const { rows } = await db.query(
    `SELECT id, name, email FROM users WHERE gym_id = $1 AND role = 'admin'`,
    [gymId]
  );
  return rows;
}

async function listByGym(gymId, role) {
  const params = [gymId];
  let sql = `SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE gym_id = $1`;
  if (role) {
    params.push(role);
    sql += ` AND role = $2`;
  }
  sql += ` ORDER BY created_at DESC`;
  const { rows } = await db.query(sql, params);
  return rows;
}

async function updateRoleAndStatus(id, gymId, { role, isActive }) {
  const { rows } = await db.query(
    `UPDATE users SET role = COALESCE($3, role), is_active = COALESCE($4, is_active)
     WHERE id = $1 AND gym_id = $2
     RETURNING id, name, email, role, phone, is_active, created_at`,
    [id, gymId, role, isActive]
  );
  return rows[0] || null;
}

async function updateProfile(id, { name, phone, dateOfBirth, profilePhotoUrl }) {
  const { rows } = await db.query(
    `UPDATE users SET
       name = COALESCE($2, name),
       phone = COALESCE($3, phone),
       date_of_birth = COALESCE($4, date_of_birth),
       profile_photo_url = COALESCE($5, profile_photo_url)
     WHERE id = $1
     RETURNING id, name, email, role, gym_id, phone, date_of_birth, profile_photo_url, created_at`,
    [id, name, phone, dateOfBirth, profilePhotoUrl]
  );
  return rows[0] || null;
}

async function updatePasswordHash(id, passwordHash) {
  await db.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
}

module.exports = {
  findByEmail,
  findById,
  create,
  listByGym,
  listPendingApproval,
  listAdmins,
  updateRoleAndStatus,
  updateProfile,
  updatePasswordHash,
};
