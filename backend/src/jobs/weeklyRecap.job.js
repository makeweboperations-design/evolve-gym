// Run once a week (Sunday evening, wired up via node-cron in server.js —
// and also reachable via the /api/jobs/run-due catch-up endpoint, see
// jobs.controller.js for why that exists) — sends every eligible member a
// short recap of how their week went: days logged, weight change, and
// diet/workout checklist consistency. Turns the data they've already
// entered into an actual takeaway instead of it just sitting in the
// calendar unread.
require('dotenv').config();
const db = require('../config/db');
const notificationModel = require('../models/notification.model');
const notificationService = require('../services/notification.service');

const GYM_TZ = 'Asia/Kolkata';

function gymLocalParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: GYM_TZ,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { dayIndex, hour: Number(parts.hour), year: parts.year, month: parts.month, day: parts.day };
}

// A recap for "this week" is only meaningful once the week has actually
// mostly happened — Sunday evening through Monday evening is the
// intended window (the extra day is slack for a free-tier host that was
// asleep exactly at 6:00 PM Sunday; the external catch-up endpoint can
// still deliver it Monday instead of not at all).
function isWithinRecapWindow() {
  const { dayIndex, hour } = gymLocalParts();
  return (dayIndex === 0 && hour >= 18) || dayIndex === 1;
}

// Identifies the ISO-ish week this recap covers, so the dedup check below
// is "have I already sent THIS week's recap" rather than "have I sent
// any recap today" — the old per-day check would otherwise let the
// external catch-up endpoint re-send a "weekly" recap every single day
// it happens to be pinged.
function currentWeekType() {
  const { year, month, day } = gymLocalParts();
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `WKRCP_${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`;
}

function checklistAveragePercent(rows, field) {
  const withItems = rows.filter((r) => Array.isArray(r[field]) && r[field].length > 0);
  if (withItems.length === 0) return null;
  const totalPct = withItems.reduce((sum, r) => {
    const done = r[field].filter((item) => item.done).length;
    return sum + (done / r[field].length) * 100;
  }, 0);
  return Math.round(totalPct / withItems.length);
}

function buildMessage({ daysLogged, weightChange, dietPct, workoutPct }) {
  if (daysLogged === 0) {
    return "You didn't log any progress this week — no worries, a fresh week starts now. Even a quick daily note helps you actually see what's working.";
  }

  const parts = [`You logged ${daysLogged}/7 day${daysLogged === 1 ? '' : 's'} this week.`];

  if (weightChange !== null) {
    const direction = weightChange < 0 ? 'down' : weightChange > 0 ? 'up' : 'steady at';
    parts.push(`Weight ${direction}${weightChange !== 0 ? ` ${Math.abs(weightChange)} kg` : ''}.`);
  }
  if (dietPct !== null) parts.push(`Diet checklist averaged ${dietPct}% complete.`);
  if (workoutPct !== null) parts.push(`Workout checklist averaged ${workoutPct}% complete.`);

  parts.push(daysLogged >= 6 ? 'Excellent consistency — keep it up!' : 'Try to log a little more often next week for a clearer picture.');

  return parts.join(' ');
}

async function runWeeklyRecap() {
  if (!isWithinRecapWindow()) return 0;

  const weekType = currentWeekType();

  const { rows: eligible } = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN LATERAL (
       SELECT * FROM memberships WHERE user_id = u.id ORDER BY end_date DESC LIMIT 1
     ) m ON true
     WHERE u.role = 'customer'
       AND u.is_active = TRUE
       AND m.status = 'active'
       AND m.end_date >= CURRENT_DATE`
  );

  let sent = 0;
  for (const member of eligible) {
    const alreadySent = await notificationModel.existsEver(member.id, weekType);
    if (alreadySent) continue;

    const { rows: weekLogs } = await db.query(
      `SELECT log_date, weight_kg, diet_checklist, workout_checklist
       FROM progress_logs
       WHERE user_id = $1 AND log_date BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
       ORDER BY log_date ASC`,
      [member.id]
    );

    const weighed = weekLogs.filter((r) => r.weight_kg !== null);
    const weightChange =
      weighed.length >= 2 ? Number((weighed[weighed.length - 1].weight_kg - weighed[0].weight_kg).toFixed(1)) : null;

    const message = buildMessage({
      daysLogged: weekLogs.length,
      weightChange,
      dietPct: checklistAveragePercent(weekLogs, 'diet_checklist'),
      workoutPct: checklistAveragePercent(weekLogs, 'workout_checklist'),
    });

    await notificationService.notify({
      userId: member.id,
      userEmail: member.email,
      userName: member.name,
      type: weekType,
      subject: 'Your weekly progress recap',
      message,
    });
    sent++;
  }

  return sent;
}

module.exports = { runWeeklyRecap };

// If run directly: `node src/jobs/weeklyRecap.job.js`
if (require.main === module) {
  runWeeklyRecap()
    .then((count) => {
      console.log(`Sent ${count} weekly recap(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
