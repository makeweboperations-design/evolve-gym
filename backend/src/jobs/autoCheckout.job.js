// Runs once nightly at gym closing time (10:30 PM, wired up via node-cron
// in server.js) — anyone still checked in gets automatically checked out,
// and gets a notification explaining why (so "N/A total time" on their
// attendance history isn't a mystery).
require('dotenv').config();
const attendanceModel = require('../models/attendance.model');
const notificationService = require('../services/notification.service');

async function runAutoCheckout() {
  const open = await attendanceModel.listOpenRecords();

  let count = 0;
  for (const record of open) {
    await attendanceModel.autoCheckOut(record.id);

    try {
      await notificationService.notify({
        userId: record.user_id,
        userEmail: record.email,
        userName: record.name,
        type: 'ATTENDANCE_AUTO_CHECKOUT',
        subject: "You weren't checked out",
        message: "Looks like you forgot to check out today — the system automatically checked you out at gym closing time (10:30 PM), so your total time for today shows as N/A. Remember to tap \"Check out\" on your way out next time!",
      });
    } catch (notifyErr) {
      console.error('Failed to send auto-checkout notification:', notifyErr);
    }

    count++;
  }

  return count;
}

module.exports = { runAutoCheckout };

// If run directly: `node src/jobs/autoCheckout.job.js`
if (require.main === module) {
  runAutoCheckout()
    .then((count) => {
      console.log(`Auto-checked-out ${count} member(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
