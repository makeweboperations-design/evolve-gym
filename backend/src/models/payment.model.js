const db = require('../config/db');

async function create({ userId, planId, amount, orderId }) {
  const { rows } = await db.query(
    `INSERT INTO payments (user_id, plan_id, amount, currency, status, gateway, order_id)
     VALUES ($1, $2, $3, 'INR', 'pending', 'razorpay', $4)
     RETURNING *`,
    [userId, planId, amount, orderId]
  );
  return rows[0];
}

async function findByOrderId(orderId) {
  const { rows } = await db.query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
  return rows[0] || null;
}

async function markSuccess(id, { gatewayPaymentId, membershipId }) {
  const { rows } = await db.query(
    `UPDATE payments SET status = 'success', gateway_payment_id = $2, membership_id = $3
     WHERE id = $1 RETURNING *`,
    [id, gatewayPaymentId, membershipId]
  );
  return rows[0];
}

async function markFailed(id) {
  await db.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [id]);
}

async function listByUser(userId) {
  const { rows } = await db.query(
    `SELECT p.*, mp.name AS plan_name
     FROM payments p
     LEFT JOIN membership_plans mp ON mp.id = p.plan_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { create, findByOrderId, markSuccess, markFailed, listByUser };
