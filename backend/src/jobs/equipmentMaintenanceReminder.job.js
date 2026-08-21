// Run daily (wired up via node-cron in server.js) to notify a gym's admins
// when equipment maintenance is coming up in the next few days, so it can
// be scheduled before the equipment actually breaks down or goes overdue.
require('dotenv').config();
const db = require('../config/db');
const notificationModel = require('../models/notification.model');
const notificationService = require('../services/notification.service');
const userModel = require('../models/user.model');

const LOOKAHEAD_DAYS = 3;

async function runEquipmentMaintenanceReminders() {
  const { rows: dueSoon } = await db.query(
    `SELECT id, gym_id, name, next_maintenance_date
     FROM equipment
     WHERE next_maintenance_date IS NOT NULL
       AND next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval
       AND status <> 'out_of_service'`,
    [LOOKAHEAD_DAYS]
  );

  let sent = 0;

  // Group by gym so we only fetch each gym's admin list once.
  const byGym = new Map();
  for (const item of dueSoon) {
    if (!byGym.has(item.gym_id)) byGym.set(item.gym_id, []);
    byGym.get(item.gym_id).push(item);
  }

  for (const [gymId, items] of byGym) {
    const admins = await userModel.listAdmins(gymId);
    if (admins.length === 0) continue;

    for (const item of items) {
      const daysLeft = Math.ceil((new Date(item.next_maintenance_date) - new Date()) / (1000 * 60 * 60 * 24));
      const timeframe = daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      const type = `EQUIP_MAINT_${item.id.slice(0, 8)}`;

      for (const admin of admins) {
        // Skip if we already reminded this admin about this equipment today.
        const alreadySent = await notificationModel.existsToday(admin.id, type);
        if (alreadySent) continue;

        await notificationService.notify({
          userId: admin.id,
          userEmail: admin.email,
          userName: admin.name,
          type,
          subject: 'Equipment maintenance due soon',
          message: `${item.name} is due for maintenance ${timeframe} (${new Date(item.next_maintenance_date).toLocaleDateString()}). Schedule a technician or mark it under maintenance from the Equipment page.`,
        });

        sent++;
      }
    }
  }

  return sent;
}

module.exports = { runEquipmentMaintenanceReminders };

// If run directly: `node src/jobs/equipmentMaintenanceReminder.job.js`
if (require.main === module) {
  runEquipmentMaintenanceReminders()
    .then((count) => {
      console.log(`Sent ${count} equipment maintenance reminder(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
