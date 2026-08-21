const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/payments.controller');

router.get('/me', requireAuth, requireRole(roles.CUSTOMER), controller.listMine);
router.post('/create-order', requireAuth, requireRole(roles.CUSTOMER), controller.createOrder);
router.post('/verify', requireAuth, requireRole(roles.CUSTOMER), controller.verify);

module.exports = router;
