const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/adminOverview.controller');

router.get('/overview', requireAuth, requireRole(roles.ADMIN), controller.getOverview);

module.exports = router;
