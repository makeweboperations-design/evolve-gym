const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/membershipPlans.controller');

// Anyone logged in can view plans (customers need to see pricing too);
// only admins can create/edit/delete them.
router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, requireRole(roles.ADMIN), controller.create);
router.patch('/:id', requireAuth, requireRole(roles.ADMIN), controller.update);
router.delete('/:id', requireAuth, requireRole(roles.ADMIN), controller.remove);

module.exports = router;
