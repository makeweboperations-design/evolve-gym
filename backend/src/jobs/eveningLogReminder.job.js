// Run once each evening (wired up via node-cron in server.js — and also
// reachable via the /api/jobs/run-due catch-up endpoint) to nudge members
// who are eligible to use the progress tracker but haven't logged
// anything yet today — a quick reminder before the day (and their streak)
// is gone for good.
require('dotenv').config();
const db = require('../config/db');
const notificationModel = require('../models/notification.model');
const notificationService = require('../services/notification.service');

const GYM_TZ = 'Asia/Kolkata';

// Guards against the external catch-up endpoint (which may get pinged any
// time of day) firing this before it's actually evening — someone who
// simply hasn't logged yet at 10 AM shouldn't get an "evening" reminder.
function isEveningYet() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: GYM_TZ, hour: 'numeric', hour12: false }).format(new Date())
  );
  return hour >= 20;
}

async function runEveningLogReminders() {
  if (!isEveningYet()) return 0;

  const { rows: notLoggedToday } = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN LATERAL (
       SELECT * FROM memberships WHERE user_id = u.id ORDER BY end_date DESC LIMIT 1
     ) m ON true
     WHERE u.role = 'customer'
       AND u.is_active = TRUE
       AND m.status = 'active'
       AND m.end_date >= CURRENT_DATE
       AND NOT EXISTS (
         SELECT 1 FROM progress_logs pl
         WHERE pl.user_id = u.id AND pl.log_date = (NOW() AT TIME ZONE $1)::date
       )`,
    [GYM_TZ]
  );

  let sent = 0;
  for (const member of notLoggedToday) {
    // Safe to re-run without spamming — one reminder per member per day.
    const alreadySent = await notificationModel.existsToday(member.id, 'EVENING_LOG_REMINDER');
    if (alreadySent) continue;

    await notificationService.notify({
      userId: member.id,
      userEmail: member.email,
      userName: member.name,
      type: 'EVENING_LOG_REMINDER',
      subject: "You haven't logged today yet",
      message: "Quick reminder — you haven't logged your progress today. It only takes a minute, and it's the easiest way to keep your streak and stay on top of your goal. Log it before the day's over!",
    });
    sent++;
  }

  return sent;
}

module.exports = { runEveningLogReminders };

// If run directly: `node src/jobs/eveningLogReminder.job.js`
if (require.main === module) {
  runEveningLogReminders()
    .then((count) => {
      console.log(`Sent ${count} evening log reminder(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
