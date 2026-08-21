const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireActive } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/attendance.controller');

// Self-healing auto-checkout catch-up (see attendance.model.js for why) —
// runs on every request to this router, after auth so we know who's
// asking, before any of the actual route logic below.
router.use(requireAuth, controller.runCatchUp);

router.get('/me', requireRole(roles.CUSTOMER), requireActive, controller.listMine);
router.post('/check-in/self', requireRole(roles.CUSTOMER), requireActive, controller.checkInSelf);
router.post('/check-out/self', requireRole(roles.CUSTOMER), requireActive, controller.checkOutSelf);

router.get('/today', requireRole(roles.ADMIN, roles.RECEPTIONIST), controller.listToday);
router.post('/check-in', requireRole(roles.ADMIN, roles.RECEPTIONIST), controller.checkInManual);
router.post('/check-out', requireRole(roles.ADMIN, roles.RECEPTIONIST), controller.checkOutManual);

module.exports = router;
