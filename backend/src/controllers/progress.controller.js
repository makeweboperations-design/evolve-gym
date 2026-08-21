const { z } = require('zod');
const progressModel = require('../models/progress.model');
const bmiModel = require('../models/bmi.model');
const auditLog = require('../services/auditLog.service');
const notificationService = require('../services/notification.service');
const notificationModel = require('../models/notification.model');

const checklistItemSchema = z.object({
  text: z.string().min(1).max(200),
  done: z.boolean(),
});

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  weightKg: z.number().positive().max(400).optional(),
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
  dietNotes: z.string().max(1000).optional(),
  dietChecklist: z.array(checklistItemSchema).max(30).optional(),
  workoutNotes: z.string().max(1000).optional(),
  workoutChecklist: z.array(checklistItemSchema).max(30).optional(),
  waterMl: z.number().int().nonnegative().max(15000).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  waistCm: z.number().positive().max(300).optional(),
  chestCm: z.number().positive().max(300).optional(),
  armsCm: z.number().positive().max(200).optional(),
  hipsCm: z.number().positive().max(300).optional(),
});

const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365];

// POST /api/progress — create or update today's (or a specified date's) entry.
// Also detects "firsts" worth celebrating (a new streak milestone, or a new
// lowest/highest logged weight) so the frontend can show an instant,
// no-waiting-for-the-notification-bell congratulation.
async function saveLog(req, res, next) {
  try {
    const data = logSchema.parse(req.body);

    // Snapshot records BEFORE this save, so we can tell what's actually new.
    const before = await progressModel.getWeightStats(req.user.id);
    const beforeToday = data.waterMl !== undefined ? await progressModel.getByDate(req.user.id, data.date) : null;

    const log = await progressModel.upsertLog({
      userId: req.user.id,
      gymId: req.user.gymId,
      logDate: data.date,
      weightKg: data.weightKg,
      notes: data.notes,
      photoUrl: data.photoUrl,
      dietNotes: data.dietNotes,
      dietChecklist: data.dietChecklist,
      workoutNotes: data.workoutNotes,
      workoutChecklist: data.workoutChecklist,
      waterMl: data.waterMl,
      mood: data.mood,
      waistCm: data.waistCm,
      chestCm: data.chestCm,
      armsCm: data.armsCm,
      hipsCm: data.hipsCm,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PROGRESS_LOG_SAVED',
      targetType: 'progress_log',
      targetId: log.id,
      metadata: { date: data.date },
      ipAddress: req.ip,
    });

    const achievements = {};

    if (data.weightKg) {
      if (before.lowest === null || data.weightKg < before.lowest) achievements.newLowestWeight = data.weightKg;
      if (before.highest === null || data.weightKg > before.highest) achievements.newHighestWeight = data.weightKg;
    }

    // Fire once, right when the goal is first crossed for the day — not
    // on every subsequent top-up after it's already been reached.
    if (data.waterMl !== undefined) {
      const waterGoal = await progressModel.getWaterGoal(req.user.id);
      if (waterGoal) {
        const wasBelow = (beforeToday?.water_ml ?? 0) < waterGoal.daily_goal_ml;
        const isNowAtOrAbove = data.waterMl >= waterGoal.daily_goal_ml;
        if (wasBelow && isNowAtOrAbove) achievements.waterGoalReached = true;
      }
    }

    // Only flag a streak milestone on the exact day it's reached — and
    // only notify once for it, no matter how many more times the log gets
    // saved that same day (e.g. several water quick-adds all call this
    // same endpoint). Without the existsToday guard, the streak stays at
    // the milestone number for the rest of the day, so every subsequent
    // save would re-match STREAK_MILESTONES.includes(...) and fire again.
    const currentStreak = await progressModel.getCurrentStreak(req.user.id);
    if (STREAK_MILESTONES.includes(currentStreak)) {
      const notificationType = `STREAK_${currentStreak}`;
      const alreadyNotifiedToday = await notificationModel.existsToday(req.user.id, notificationType);
      if (!alreadyNotifiedToday) {
        achievements.streakMilestone = currentStreak;
        try {
          await notificationService.notify({
            userId: req.user.id,
            type: notificationType,
            subject: `${currentStreak}-day logging streak!`,
            message: `You've logged your progress ${currentStreak} days in a row — that's real consistency. Keep it going!`,
          });
        } catch (notifyErr) {
          console.error('Failed to send streak milestone notification:', notifyErr);
        }
      }
    }

    res.status(201).json({ ...log, achievements });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12), // 1-12, calendar-natural
});

// GET /api/progress?year=2026&month=7 — every logged day that month, plus a
// small summary (days logged, weight change from first to last logged day).
async function getMonth(req, res, next) {
  try {
    const { year, month } = monthQuerySchema.parse(req.query);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const logs = await progressModel.listInRange(req.user.id, start, end);

    const weighed = logs.filter((l) => l.weight_kg !== null);
    const summary = {
      daysLogged: logs.length,
      startWeight: weighed[0]?.weight_kg ?? null,
      endWeight: weighed[weighed.length - 1]?.weight_kg ?? null,
    };
    summary.weightChange =
      summary.startWeight !== null && summary.endWeight !== null
        ? Number((summary.endWeight - summary.startWeight).toFixed(1))
        : null;

    res.json({ logs, summary });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid year/month' });
    }
    next(err);
  }
}

async function getDay(req, res, next) {
  try {
    const log = await progressModel.getByDate(req.user.id, req.params.date);
    res.json(log || null);
  } catch (err) {
    next(err);
  }
}

async function removeDay(req, res, next) {
  try {
    const deleted = await progressModel.deleteByDate(req.user.id, req.params.date);
    if (!deleted) return res.status(404).json({ message: 'No entry for that date' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PROGRESS_LOG_DELETED',
      targetType: 'progress_log',
      targetId: deleted.id,
      metadata: { date: req.params.date },
      ipAddress: req.ip,
    });

    res.json({ message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
}

const rangeQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET /api/progress/range?start=2026-07-01&end=2026-07-07 — arbitrary date
// range, used for the "This Week" view (which can span a month boundary,
// unlike the calendar's fixed month view).
async function getRange(req, res, next) {
  try {
    const { start, end } = rangeQuerySchema.parse(req.query);
    const logs = await progressModel.listInRange(req.user.id, start, end);

    const weighed = logs.filter((l) => l.weight_kg !== null);
    const summary = {
      daysLogged: logs.length,
      startWeight: weighed[0]?.weight_kg ?? null,
      endWeight: weighed[weighed.length - 1]?.weight_kg ?? null,
    };
    summary.weightChange =
      summary.startWeight !== null && summary.endWeight !== null
        ? Number((summary.endWeight - summary.startWeight).toFixed(1))
        : null;

    res.json({ logs, summary });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid start/end date' });
    }
    next(err);
  }
}

const goalSchema = z.object({
  goalType: z.enum(['lose', 'gain', 'maintain']),
  startingWeightKg: z.number().positive().max(400).optional(),
  targetWeightKg: z.number().positive().max(400).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/progress/goal
async function getGoal(req, res, next) {
  try {
    const goal = await progressModel.getGoal(req.user.id);
    res.json(goal || null);
  } catch (err) {
    next(err);
  }
}

// PUT /api/progress/goal — set or update the member's one active goal.
async function saveGoal(req, res, next) {
  try {
    const data = goalSchema.parse(req.body);
    const goal = await progressModel.upsertGoal({
      userId: req.user.id,
      goalType: data.goalType,
      startingWeightKg: data.startingWeightKg,
      targetWeightKg: data.targetWeightKg,
      targetDate: data.targetDate,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PROGRESS_GOAL_SAVED',
      targetType: 'progress_goal',
      targetId: goal.id,
      ipAddress: req.ip,
    });

    res.json(goal);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// DELETE /api/progress/goal — clear it (e.g. reached the target, or starting fresh).
async function clearGoal(req, res, next) {
  try {
    await progressModel.deleteGoal(req.user.id);
    res.json({ message: 'Goal cleared' });
  } catch (err) {
    next(err);
  }
}

function bmiCategoryFor(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// GET /api/progress/bmi — auto-calculated from the member's last saved
// height (from the BMI calculator) and their most recently logged weight,
// so they don't have to re-enter anything to see a current BMI here.
async function getBmi(req, res, next) {
  try {
    const [heightCm, latestLog] = await Promise.all([
      bmiModel.getLatestHeight(req.user.id),
      progressModel.getLatestWeighIn(req.user.id),
    ]);

    if (!heightCm || !latestLog?.weight_kg) {
      return res.json({ available: false, heightCm: heightCm || null, weightKg: latestLog?.weight_kg ?? null });
    }

    const heightM = heightCm / 100;
    const bmi = Number((latestLog.weight_kg / (heightM * heightM)).toFixed(1));
    res.json({
      available: true,
      heightCm,
      weightKg: latestLog.weight_kg,
      bmi,
      category: bmiCategoryFor(bmi),
      asOfDate: latestLog.log_date,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/records — all-time personal records: longest/current
// streak, lowest/highest weight ever logged, total days logged.
async function getRecords(req, res, next) {
  try {
    const [stats, longestStreak, currentStreak] = await Promise.all([
      progressModel.getWeightStats(req.user.id),
      progressModel.getLongestStreak(req.user.id),
      progressModel.getCurrentStreak(req.user.id),
    ]);

    res.json({
      lowestWeight: stats.lowest,
      highestWeight: stats.highest,
      totalDaysLogged: stats.total_days_logged,
      firstLogDate: stats.first_log_date,
      hasMeasurement: stats.has_measurement,
      longestStreak,
      currentStreak,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  saveLog, getMonth, getRange, getDay, removeDay, getGoal, saveGoal, clearGoal,
  getBmi, updateHeight, getRecords, getHeatmap, getWaterGoal, saveWaterGoal, getMeasurements,
};

const heightSchema = z.object({
  heightCm: z.number().positive().max(300),
});

// PUT /api/progress/height — lets a member update their height directly
// from the progress tracker's BMI card, rather than having to go find the
// separate BMI calculator. Recomputes BMI immediately using their most
// recent logged weight (if any) and saves it as a new bmi_logs entry, so
// it becomes the new "latest height" going forward.
async function updateHeight(req, res, next) {
  try {
    const data = heightSchema.parse(req.body);
    const latestWeighIn = await progressModel.getLatestWeighIn(req.user.id);
    const weightKg = latestWeighIn?.weight_kg ?? null;

    let bmi = null;
    let category = null;
    if (weightKg) {
      const heightM = data.heightCm / 100;
      bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
      category = bmiCategoryFor(bmi);
    }

    const saved = await bmiModel.saveResult({
      userId: req.user.id,
      heightCm: data.heightCm,
      weightKg,
      bmi,
      category,
    });

    res.json(saved);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// GET /api/progress/measurements — the most recent day with at least one
// body measurement filled in.
async function getMeasurements(req, res, next) {
  try {
    const latest = await progressModel.getLatestMeasurements(req.user.id);
    res.json(latest);
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/heatmap?weeks=12 — per-day completion levels (0-4) for
// the consistency heatmap: how much of that day was actually filled in,
// not just whether a row exists.
async function getHeatmap(req, res, next) {
  try {
    const weeks = Math.min(26, Math.max(4, parseInt(req.query.weeks, 10) || 12));
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - weeks * 7 + 1);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const days = await progressModel.listCompletionInRange(req.user.id, startStr, endStr);
    res.json({
      weeks,
      startDate: startStr,
      endDate: endStr,
      days: days.map((d) => ({ date: d.date.toISOString().slice(0, 10), level: d.level })),
    });
  } catch (err) {
    next(err);
  }
}

const waterGoalSchema = z.object({
  dailyGoalMl: z.number().int().positive().max(10000),
});

// GET /api/progress/water-goal
async function getWaterGoal(req, res, next) {
  try {
    const goal = await progressModel.getWaterGoal(req.user.id);
    res.json(goal || null);
  } catch (err) {
    next(err);
  }
}

// PUT /api/progress/water-goal — set or update the member's daily water target.
async function saveWaterGoal(req, res, next) {
  try {
    const data = waterGoalSchema.parse(req.body);
    const goal = await progressModel.upsertWaterGoal(req.user.id, data.dailyGoalMl);
    res.json(goal);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}
