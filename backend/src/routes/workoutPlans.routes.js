const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireActive } = require('../middleware/auth');
const roles = require('../config/roles');
const workoutPlanModel = require('../models/workoutPlan.model');
const createPlanController = require('./../controllers/planControllerFactory');
const { WORKOUT_TEMPLATES } = require('../config/planTemplates');

const controller = createPlanController(workoutPlanModel, 'workout_plan', 'WORKOUT_PLAN', WORKOUT_TEMPLATES);

router.get('/templates', requireAuth, controller.getTemplates);
router.get('/mine', requireAuth, requireRole(roles.TRAINER), controller.listMine);
router.get('/me', requireAuth, requireRole(roles.CUSTOMER), requireActive, controller.listForMe);
router.post('/', requireAuth, requireRole(roles.TRAINER), controller.upsert);
router.put('/me', requireAuth, requireRole(roles.CUSTOMER), requireActive, controller.updateMine);

module.exports = router;
