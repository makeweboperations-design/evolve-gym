const express = require('express');
const router = express.Router();
const controller = require('../controllers/jobs.controller');

// No requireAuth here on purpose — this is meant to be hit by an external
// scheduler, not a logged-in user. Protected instead by the ?key= secret
// checked inside the controller.
router.get('/run-due', controller.runDue);
router.post('/run-due', controller.runDue);

module.exports = router;
