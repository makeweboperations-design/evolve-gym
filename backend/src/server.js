require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { runRenewalReminders } = require('./jobs/renewalReminder.job');
const { runEquipmentMaintenanceReminders } = require('./jobs/equipmentMaintenanceReminder.job');
const { runEveningLogReminders } = require('./jobs/eveningLogReminder.job');
const { runWeeklyRecap } = require('./jobs/weeklyRecap.job');
const { runAutoCheckout } = require('./jobs/autoCheckout.job');

const PORT = process.env.PORT || 5000;

// All of the scheduled jobs below are meant to run at specific times of
// day for the gym in real life, not for whatever server the app happens
// to be hosted on. node-cron defaults to the process's system timezone —
// on most hosts (including Render) that's UTC — so without an explicit
// timezone, "10:30 PM" would actually fire at 10:30 PM UTC (4:00 AM IST),
// nowhere near gym closing time. Change this if the gym isn't in India.
const GYM_TIMEZONE = 'Asia/Kolkata';

app.listen(PORT, () => {
  console.log(`Gym SaaS API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Runs every day at 9:00 AM server time. Adjust the cron expression if you'd
// rather reminders go out at a different hour.
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily renewal reminder job…');
  try {
    const count = await runRenewalReminders();
    console.log(`Renewal reminder job sent ${count} notification(s).`);
  } catch (err) {
    console.error('Renewal reminder job failed:', err);
  }
}, { timezone: GYM_TIMEZONE });

// Runs a few minutes later so the two jobs don't hit the DB at the exact
// same second. Notifies admins when equipment maintenance is due soon.
cron.schedule('5 9 * * *', async () => {
  console.log('Running daily equipment maintenance reminder job…');
  try {
    const count = await runEquipmentMaintenanceReminders();
    console.log(`Equipment maintenance reminder job sent ${count} notification(s).`);
  } catch (err) {
    console.error('Equipment maintenance reminder job failed:', err);
  }
}, { timezone: GYM_TIMEZONE });

// Runs every evening at 8:00 PM — nudges members who haven't logged their
// progress yet today, before the day (and their streak) is gone.
cron.schedule('0 20 * * *', async () => {
  console.log('Running evening progress log reminder job…');
  try {
    const count = await runEveningLogReminders();
    console.log(`Evening log reminder job sent ${count} notification(s).`);
  } catch (err) {
    console.error('Evening log reminder job failed:', err);
  }
}, { timezone: GYM_TIMEZONE });

// Runs Sunday evening at 6:00 PM — sends every eligible member a recap of
// their week (days logged, weight change, checklist consistency).
cron.schedule('0 18 * * 0', async () => {
  console.log('Running weekly progress recap job…');
  try {
    const count = await runWeeklyRecap();
    console.log(`Weekly recap job sent ${count} notification(s).`);
  } catch (err) {
    console.error('Weekly recap job failed:', err);
  }
}, { timezone: GYM_TIMEZONE });

// Runs at gym closing time, 10:30 PM daily — anyone still checked in gets
// automatically checked out, with a notification explaining why.
cron.schedule('30 22 * * *', async () => {
  console.log('Running auto-checkout job…');
  try {
    const count = await runAutoCheckout();
    console.log(`Auto-checkout job checked out ${count} member(s).`);
  } catch (err) {
    console.error('Auto-checkout job failed:', err);
  }
}, { timezone: GYM_TIMEZONE });
