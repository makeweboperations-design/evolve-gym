const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireActive } = require('../middleware/auth');
const controller = require('../controllers/bmi.controller');

// Any visitor can calculate; if logged in (token attached), it also saves.
router.post('/calculate', optionalAuth, controller.calculate);
router.get('/history', requireAuth, requireActive, controller.history);

module.exports = router;
