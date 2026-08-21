const { z } = require('zod');
const planModel = require('../models/membershipPlan.model');
const auditLog = require('../services/auditLog.service');

const createSchema = z.object({
  name: z.string().min(2),
  durationDays: z.number().int().positive(),
  price: z.number().positive(),
  description: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

async function list(req, res, next) {
  try {
    const plans = await planModel.listByGym(req.user.gymId);
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const plan = await planModel.create({ gymId: req.user.gymId, ...data });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_PLAN_CREATED',
      targetType: 'membership_plan',
      targetId: plan.id,
      metadata: { name: plan.name, price: plan.price },
      ipAddress: req.ip,
    });

    res.status(201).json(plan);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const plan = await planModel.update(req.params.id, req.user.gymId, data);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_PLAN_UPDATED',
      targetType: 'membership_plan',
      targetId: plan.id,
      metadata: data,
      ipAddress: req.ip,
    });

    res.json(plan);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await planModel.remove(req.params.id, req.user.gymId);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'MEMBERSHIP_PLAN_DELETED',
      targetType: 'membership_plan',
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
