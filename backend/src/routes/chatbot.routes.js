const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const controller = require('../controllers/chatbot.controller');

// Any logged-in user (of any role) can read the FAQ list and ask questions —
// they just can't manage the FAQ content themselves.
router.get('/faqs', requireAuth, controller.list);
router.post('/ask', requireAuth, controller.ask);

// Public, no login required — for the landing page chatbot. Scoped by a
// gymId query param since a visitor has no session (and therefore no
// gymId) to key off of.
router.get('/public/faqs', controller.publicList);
router.post('/public/ask', controller.publicAsk);

router.post('/faqs', requireAuth, requireRole(roles.ADMIN), controller.create);
router.patch('/faqs/:id', requireAuth, requireRole(roles.ADMIN), controller.update);
router.delete('/faqs/:id', requireAuth, requireRole(roles.ADMIN), controller.remove);

module.exports = router;
