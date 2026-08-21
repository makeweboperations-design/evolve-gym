const db = require('../config/db');

async function listByCustomer(customerId) {
  const { rows } = await db.query(
    `SELECT d.*, t.name AS trainer_name
     FROM diet_plans d
     LEFT JOIN users t ON t.id = d.trainer_id
     WHERE d.customer_id = $1
     ORDER BY d.updated_at DESC`,
    [customerId]
  );
  return rows;
}

async function listByTrainer(trainerId) {
  const { rows } = await db.query(
    `SELECT d.*, c.name AS customer_name, c.email AS customer_email
     FROM diet_plans d
     JOIN users c ON c.id = d.customer_id
     WHERE d.trainer_id = $1
     ORDER BY d.updated_at DESC`,
    [trainerId]
  );
  return rows;
}

// Trainer: create or update the plan they've written for a given customer.
async function upsertForCustomer({ customerId, trainerId, title, details, goal, editedBy, editedRole }) {
  const { rows: existing } = await db.query(
    `SELECT id FROM diet_plans WHERE customer_id = $1 AND trainer_id = $2 LIMIT 1`,
    [customerId, trainerId]
  );

  if (existing[0]) {
    const { rows } = await db.query(
      `UPDATE diet_plans
       SET title = $2, details = $3, goal = $4, last_edited_by = $5, last_edited_role = $6, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [existing[0].id, title, details, goal || null, editedBy, editedRole]
    );
    return { plan: rows[0], created: false };
  }

  const { rows } = await db.query(
    `INSERT INTO diet_plans (customer_id, trainer_id, title, details, goal, last_edited_by, last_edited_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [customerId, trainerId, title, details, goal || null, editedBy, editedRole]
  );
  return { plan: rows[0], created: true };
}

// Customer: edit whichever plan is currently assigned to them (most recently
// updated one), or start a fresh one from a template if none exists yet.
async function updateOwnPlan({ customerId, title, details, goal, editedBy }) {
  const { rows: existing } = await db.query(
    `SELECT id, trainer_id FROM diet_plans WHERE customer_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [customerId]
  );

  if (existing[0]) {
    const { rows } = await db.query(
      `UPDATE diet_plans
       SET title = $2, details = $3, goal = $4, last_edited_by = $5, last_edited_role = 'customer', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [existing[0].id, title, details, goal || null, editedBy]
    );
    return { plan: rows[0], created: false };
  }

  const { rows } = await db.query(
    `INSERT INTO diet_plans (customer_id, trainer_id, title, details, goal, last_edited_by, last_edited_role)
     VALUES ($1, NULL, $2, $3, $4, $5, 'customer') RETURNING *`,
    [customerId, title, details, goal || null, editedBy]
  );
  return { plan: rows[0], created: true };
}

module.exports = { listByCustomer, listByTrainer, upsertForCustomer, updateOwnPlan };
