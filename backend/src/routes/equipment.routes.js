const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/equipment.controller');

// Anyone logged in (any role, any gym staff/member) can view the equipment
// list — useful for trainers/members to see what's out of service too.
router.get('/', requireAuth, controller.list);

// Only admin/receptionist can add, edit, or remove equipment.
const canManage = requireRole(roles.ADMIN, roles.RECEPTIONIST);
router.post('/', requireAuth, canManage, controller.create);
router.patch('/:id', requireAuth, canManage, controller.update);
router.delete('/:id', requireAuth, canManage, controller.remove);

module.exports = router;
