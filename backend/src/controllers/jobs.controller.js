const { runRenewalReminders } = require('../jobs/renewalReminder.job');
const { runEquipmentMaintenanceReminders } = require('../jobs/equipmentMaintenanceReminder.job');
const { runEveningLogReminders } = require('../jobs/eveningLogReminder.job');
const { runWeeklyRecap } = require('../jobs/weeklyRecap.job');
const { runAutoCheckout } = require('../jobs/autoCheckout.job');

// POST/GET /api/jobs/run-due — lets an external scheduler (cron-job.org,
// GitHub Actions, etc.) trigger all the gym's scheduled jobs by simply
// hitting this URL every 15-30 minutes.
//
// Why this exists: node-cron (wired up in server.js) only fires if the
// Node process happens to be awake at the exact scheduled moment. On a
// free-tier host that spins down when idle (Render, Railway free plans,
// etc.), that's not guaranteed — a job scheduled for 6:00 PM simply never
// runs if the server was asleep right then, and won't run again until the
// next scheduled time comes around (a full day or week later). Pinging
// this endpoint from an always-on external service does two things at
// once: it wakes the sleeping server up (any HTTP request does that), and
// it re-checks/re-runs each job. Every job function is already safe to
// call repeatedly — each one dedupes itself (skips anyone it already
// notified today/this week) — so hitting this endpoint on a tight
// schedule just means jobs actually run close to on-time regardless of
// whether the in-process cron happened to fire.
async function runDue(req, res, next) {
  try {
    if (!process.env.CRON_SECRET || req.query.key !== process.env.CRON_SECRET) {
      return res.status(401).json({ message: 'Missing or invalid key' });
    }

    const results = {};
    const jobs = {
      renewalReminders: runRenewalReminders,
      equipmentMaintenanceReminders: runEquipmentMaintenanceReminders,
      eveningLogReminders: runEveningLogReminders,
      weeklyRecap: runWeeklyRecap,
      autoCheckout: runAutoCheckout,
    };

    for (const [name, fn] of Object.entries(jobs)) {
      try {
        results[name] = await fn();
      } catch (err) {
        console.error(`Job "${name}" failed during /api/jobs/run-due:`, err);
        results[name] = { error: err.message };
      }
    }

    res.json({ ranAt: new Date().toISOString(), results });
  } catch (err) {
    next(err);
  }
}

module.exports = { runDue };
