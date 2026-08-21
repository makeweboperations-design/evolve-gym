const { z } = require('zod');
const analyticsModel = require('../models/analytics.model');

const logSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().max(100).optional(),
});

// POST /api/analytics/pageview — public, called on every route change from
// the frontend. Fire-and-forget from the client's perspective.
async function logView(req, res, next) {
  try {
    const data = logSchema.parse(req.body);
    await analyticsModel.logView({
      path: data.path,
      referrer: data.referrer,
      sessionId: data.sessionId,
      userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).end();
    next(err);
  }
}

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// GET /api/analytics/summary?days=30 — admin-only, unlinked from any nav.
async function getSummary(req, res, next) {
  try {
    const { days } = summaryQuerySchema.parse(req.query);
    const [totals, daily, topPages, topReferrers] = await Promise.all([
      analyticsModel.getTotals(days),
      analyticsModel.getDailyCounts(days),
      analyticsModel.getTopPages(days),
      analyticsModel.getTopReferrers(days),
    ]);
    res.json({ totals, daily, topPages, topReferrers, days });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid days parameter' });
    next(err);
  }
}

module.exports = { logView, getSummary };
