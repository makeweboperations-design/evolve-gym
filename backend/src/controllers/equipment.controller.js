const { z } = require('zod');
const equipmentModel = require('../models/equipment.model');
const auditLog = require('../services/auditLog.service');

const equipmentSchema = z.object({
  name: z.string().min(1).max(150),
  category: z.string().max(60).optional(),
  status: z.enum(['operational', 'under_maintenance', 'out_of_service']).optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastMaintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextMaintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = equipmentSchema.partial();

async function list(req, res, next) {
  try {
    const items = await equipmentModel.list(req.user.gymId);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = equipmentSchema.parse(req.body);
    const item = await equipmentModel.create({ gymId: req.user.gymId, ...data });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'EQUIPMENT_CREATED',
      targetType: 'equipment',
      targetId: item.id,
      metadata: { name: item.name, status: item.status },
      ipAddress: req.ip,
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const item = await equipmentModel.update(req.params.id, req.user.gymId, data);
    if (!item) return res.status(404).json({ message: 'Equipment not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'EQUIPMENT_UPDATED',
      targetType: 'equipment',
      targetId: item.id,
      metadata: { changes: data },
      ipAddress: req.ip,
    });

    res.json(item);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await equipmentModel.remove(req.params.id, req.user.gymId);
    if (!deleted) return res.status(404).json({ message: 'Equipment not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'EQUIPMENT_DELETED',
      targetType: 'equipment',
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
