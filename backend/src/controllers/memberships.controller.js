const { z } = require('zod');
const membershipModel = require('../models/membership.model');
const planModel = require('../models/membershipPlan.model');
const auditLog = require('../services/auditLog.service');

const assignSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().optional(), // defaults to today if omitted
});

const renewSchema = z.object({
  planId: z.string().uuid().optional(), // if omitted, renews using the membership's existing plan duration
});

// GET /api/memberships — every member with computed renewal status
async function list(req, res, next) {
  try {
    const members = await membershipModel.listByGymWithStatus(req.user.gymId);
    res.json(members);
  } catch (err) {
    next(err);
  }
}

// POST /api/memberships — assign a plan to a member (new sign-up or re-sign after cancellation)
async function assign(req, res, next) {
  try {
    const data = assignSchema.parse(req.body);
    const plan = await planModel.listByGym(req.user.gymId).then((plans) => plans.find((p) => p.id === data.planId));
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const membership = await membershipModel.create({
      userId: data.userId,
      planId: data.planId,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      durationDays: plan.duration_days,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_ASSIGNED',
      targetType: 'membership',
      targetId: membership.id,
      metadata: { userId: data.userId, planId: data.planId },
      ipAddress: req.ip,
    });

    res.status(201).json(membership);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

// PATCH /api/memberships/:id/renew — extend an existing membership
async function renew(req, res, next) {
  try {
    const { planId } = renewSchema.parse(req.body);

    let durationDays;
    if (planId) {
      const plans = await planModel.listByGym(req.user.gymId);
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
      durationDays = plan.duration_days;
    } else {
      // Re-use 30 days as a sane default if no plan specified.
      // (Frontend should normally always pass planId.)
      durationDays = 30;
    }

    const membership = await membershipModel.renew(req.params.id, req.user.gymId, durationDays);
    if (!membership) return res.status(404).json({ message: 'Membership not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_RENEWED',
      targetType: 'membership',
      targetId: membership.id,
      metadata: { durationDays },
      ipAddress: req.ip,
    });

    res.json(membership);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

// PATCH /api/memberships/:id/status — freeze / cancel / reactivate
async function updateStatus(req, res, next) {
  try {
    const status = z.enum(['active', 'frozen', 'cancelled']).parse(req.body.status);
    const membership = await membershipModel.updateStatus(req.params.id, req.user.gymId, status);
    if (!membership) return res.status(404).json({ message: 'Membership not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_STATUS_CHANGED',
      targetType: 'membership',
      targetId: membership.id,
      metadata: { status },
      ipAddress: req.ip,
    });

    res.json(membership);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid status' });
    next(err);
  }
}

// GET /api/memberships/me — the logged-in customer's own membership
async function getMine(req, res, next) {
  try {
    const membership = await membershipModel.getForUser(req.user.id);
    res.json(membership); // null if they have no membership yet — frontend handles that state
  } catch (err) {
    next(err);
  }
}

module.exports = { list, assign, renew, updateStatus, getMine };
