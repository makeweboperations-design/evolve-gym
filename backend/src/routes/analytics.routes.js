const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/analytics.controller');

// Public — every visitor's browser calls this on route change, logged out
// or not. No auth possible here since anonymous visitors are the whole point.
router.post('/pageview', controller.logView);

// Admin-only, and deliberately not linked from any nav — the frontend route
// is /dev/analytics, known only to whoever needs it.
router.get('/summary', requireAuth, requireRole(roles.ADMIN), controller.getSummary);

module.exports = router;
