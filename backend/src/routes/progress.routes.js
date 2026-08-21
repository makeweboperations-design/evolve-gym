const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireActive, requireActiveMembership } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/progress.controller');

// Progress tracking is a customer-facing feature only — trainers/staff have
// their own views into member progress elsewhere, this is the member's own
// personal daily log. Deactivated members are blocked entirely, and even
// active members need a currently-valid membership plan to use this.
router.use(requireAuth, requireRole(roles.CUSTOMER), requireActive, requireActiveMembership);

router.get('/', controller.getMonth);
router.get('/range', controller.getRange);
router.get('/goal', controller.getGoal);
router.put('/goal', controller.saveGoal);
router.delete('/goal', controller.clearGoal);
router.get('/bmi', controller.getBmi);
router.put('/height', controller.updateHeight);
router.get('/measurements', controller.getMeasurements);
router.get('/records', controller.getRecords);
router.get('/heatmap', controller.getHeatmap);
router.get('/water-goal', controller.getWaterGoal);
router.put('/water-goal', controller.saveWaterGoal);
router.get('/:date', controller.getDay);
router.post('/', controller.saveLog);
router.delete('/:date', controller.removeDay);

module.exports = router;
