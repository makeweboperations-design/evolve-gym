const db = require('../config/db');

/**
 * Records an audit trail entry. Call this from controllers after any
 * meaningful write (create/update/delete on users, payments, plans, etc).
 *
 * @param {Object} entry
 * @param {string} entry.actorId - id of the user performing the action
 * @param {string} entry.actorRole - role of the actor at time of action
 * @param {string} entry.action - e.g. 'PAYMENT_CREATED', 'PLAN_UPDATED'
 * @param {string} entry.targetType - e.g. 'user', 'payment', 'workout_plan'
 * @param {string} [entry.targetId]
 * @param {Object} [entry.metadata] - extra context (old/new values, etc.)
 * @param {string} [entry.ipAddress]
 */
async function record({ actorId, actorRole, action, targetType, targetId, metadata, ipAddress }) {
  await db.query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [actorId, actorRole, action, targetType, targetId || null, metadata || {}, ipAddress || null]
  );
}

module.exports = { record };
