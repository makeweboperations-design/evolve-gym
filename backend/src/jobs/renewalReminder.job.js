// Run daily (wired up via node-cron in server.js, or can be run manually /
// via a hosted cron trigger) to notify members whose membership expires
// in 1-2 days.
require('dotenv').config();
const db = require('../config/db');
const notificationModel = require('../models/notification.model');
const notificationService = require('../services/notification.service');

async function runRenewalReminders() {
  const { rows: expiringSoon } = await db.query(
    `SELECT m.id AS membership_id, u.id AS user_id, u.name, u.email, m.end_date
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.status = 'active'
       AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'`
  );

  let sent = 0;
  for (const membership of expiringSoon) {
    // Skip if we already sent this member a renewal reminder today —
    // keeps the job safe to re-run without spamming people.
    const alreadySent = await notificationModel.existsToday(membership.user_id, 'RENEWAL_REMINDER');
    if (alreadySent) continue;

    const daysLeft = Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    const timeframe = daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

    await notificationService.notify({
      userId: membership.user_id,
      userEmail: membership.email,
      userName: membership.name,
      type: 'RENEWAL_REMINDER',
      subject: 'Your membership expires soon',
      message: `Your membership expires ${timeframe} (${new Date(membership.end_date).toLocaleDateString()}). Renew now from your dashboard to avoid any interruption.`,
    });

    sent++;
  }

  return sent;
}

module.exports = { runRenewalReminders };

// If run directly: `node src/jobs/renewalReminder.job.js`
if (require.main === module) {
  runRenewalReminders()
    .then((count) => {
      console.log(`Sent ${count} renewal reminder(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
