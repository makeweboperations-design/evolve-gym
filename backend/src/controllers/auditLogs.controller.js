const auditLogModel = require('../models/auditLog.model');

// Maps the UI's filter options to a number of days.
const RANGE_TO_DAYS = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
  '1m': 30,
  '1y': 365,
  all: null,
};

async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const range = req.query.range || 'all';
    const sinceDays = Object.prototype.hasOwnProperty.call(RANGE_TO_DAYS, range)
      ? RANGE_TO_DAYS[range]
      : null;

    const logs = await auditLogModel.listByGym(req.user.gymId, limit, sinceDays);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
