const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/notifications.controller');

router.get('/', requireAuth, controller.list);
router.get('/unread-count', requireAuth, controller.unreadCount);
router.patch('/:id/read', requireAuth, controller.markRead);

module.exports = router;
