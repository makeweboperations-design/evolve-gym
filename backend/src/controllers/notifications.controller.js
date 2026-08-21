const notificationModel = require('../models/notification.model');

async function list(req, res, next) {
  try {
    const notifications = await notificationModel.listByUser(req.user.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notificationModel.unreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationModel.markRead(req.params.id, req.user.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markRead };
