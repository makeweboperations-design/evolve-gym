const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/auditLogs.controller');

router.get('/', requireAuth, requireRole(roles.ADMIN), controller.list);

module.exports = router;
