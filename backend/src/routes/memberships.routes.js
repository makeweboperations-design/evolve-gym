const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/memberships.controller');

const staffOnly = requireRole(roles.ADMIN, roles.RECEPTIONIST);

router.get('/me', requireAuth, controller.getMine);
router.get('/', requireAuth, staffOnly, controller.list);
router.post('/', requireAuth, staffOnly, controller.assign);
router.patch('/:id/renew', requireAuth, staffOnly, controller.renew);
router.patch('/:id/status', requireAuth, staffOnly, controller.updateStatus);

module.exports = router;
