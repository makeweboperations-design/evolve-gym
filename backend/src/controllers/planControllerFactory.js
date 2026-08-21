const { z } = require('zod');
const auditLog = require('../services/auditLog.service');

const GOAL_ENUM = z.enum(['weight_loss', 'weight_gain', 'maintain', 'custom']);

const upsertSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(2),
  notes: z.string().min(1), // freeform plan content (days/exercises or meals) for the MVP editor
  goal: GOAL_ENUM.optional(),
});

const updateMineSchema = z.object({
  title: z.string().min(2),
  notes: z.string().min(1),
  goal: GOAL_ENUM.optional(),
});

// planModel: the workout or diet plan model (same shape). auditAction/targetType
// distinguish the two in the audit log without duplicating this whole file.
// templates: the WORKOUT_TEMPLATES or DIET_TEMPLATES map from planTemplates.js.
function createPlanController(planModel, targetType, auditAction, templates) {
  // Trainer: everyone they've written a plan for, or all their assigned customers
  async function listMine(req, res, next) {
    try {
      const plans = await planModel.listByTrainer(req.user.id);
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  // Customer: their own plan(s)
  async function listForMe(req, res, next) {
    try {
      const plans = await planModel.listByCustomer(req.user.id);
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  // Anyone signed in: the fixed system-provided generic templates (weight
  // loss / weight gain / maintain) trainers and customers can start from.
  async function getTemplates(req, res, next) {
    try {
      const list = Object.entries(templates).map(([goal, t]) => ({
        goal,
        label: t.label,
        title: t.title,
        notes: t.notes,
      }));
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  // Trainer: create or update the plan they've written for a given customer
  async function upsert(req, res, next) {
    try {
      const data = upsertSchema.parse(req.body);
      const { plan, created } = await planModel.upsertForCustomer({
        customerId: data.customerId,
        trainerId: req.user.id,
        title: data.title,
        details: { notes: data.notes },
        goal: data.goal,
        editedBy: req.user.id,
        editedRole: 'trainer',
      });

      await auditLog.record({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: created ? `${auditAction}_CREATED` : `${auditAction}_UPDATED`,
        targetType,
        targetId: plan.id,
        metadata: { customerId: data.customerId, goal: data.goal },
        ipAddress: req.ip,
      });

      res.status(created ? 201 : 200).json(plan);
    } catch (err) {
      if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      next(err);
    }
  }

  // Customer: edit their own currently-assigned plan (e.g. after consulting
  // their trainer), or pick/switch a template and tweak it themselves.
  async function updateMine(req, res, next) {
    try {
      const data = updateMineSchema.parse(req.body);
      const { plan, created } = await planModel.updateOwnPlan({
        customerId: req.user.id,
        title: data.title,
        details: { notes: data.notes },
        goal: data.goal,
        editedBy: req.user.id,
      });

      await auditLog.record({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: created ? `${auditAction}_CREATED` : `${auditAction}_SELF_EDITED`,
        targetType,
        targetId: plan.id,
        metadata: { goal: data.goal },
        ipAddress: req.ip,
      });

      res.status(created ? 201 : 200).json(plan);
    } catch (err) {
      if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      next(err);
    }
  }

  return { listMine, listForMe, getTemplates, upsert, updateMine };
}

module.exports = createPlanController;
