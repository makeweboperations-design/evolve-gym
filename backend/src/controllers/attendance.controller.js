const { z } = require('zod');
const attendanceModel = require('../models/attendance.model');
const userModel = require('../models/user.model');
const membershipModel = require('../models/membership.model');
const progressModel = require('../models/progress.model');
const notificationService = require('../services/notification.service');
const auditLog = require('../services/auditLog.service');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Runs on every request to this router (wired in attendance.routes.js) —
// see the big comment on attendanceModel.catchUpAutoCheckouts for why
// this self-healing check exists instead of relying solely on the
// nightly cron job.
async function runCatchUp(req, res, next) {
  try {
    const caughtUp = await attendanceModel.catchUpAutoCheckouts();
    for (const record of caughtUp) {
      if (!record.user) continue;
      try {
        await notificationService.notify({
          userId: record.user_id,
          userEmail: record.user.email,
          userName: record.user.name,
          type: 'ATTENDANCE_AUTO_CHECKOUT',
          subject: "You weren't checked out",
          message: "Looks like you forgot to check out — the system automatically checked you out at gym closing time (10:30 PM), so your total time for that day shows as N/A. Remember to tap \"Check out\" on your way out next time!",
        });
      } catch (notifyErr) {
        console.error('Failed to send auto-checkout notification:', notifyErr);
      }
    }
  } catch (err) {
    console.error('Auto-checkout catch-up failed:', err);
    // Non-fatal — don't block the actual request over this.
  }
  next();
}

async function hasActiveMembership(userId) {
  const membership = await membershipModel.getForUser(userId);
  return !!membership && ['active', 'expiring_soon'].includes(membership.computed_status);
}

// A check-in should count toward that day's progress-tracker streak too —
// showing up is itself a form of progress. This just ensures a (possibly
// otherwise-empty) log row exists for today; it never overwrites anything
// the member has already filled in.
async function creditProgressLog(userId, gymId) {
  try {
    await progressModel.upsertLog({ userId, gymId, logDate: todayStr() });
  } catch (err) {
    console.error('Failed to credit progress log on check-in:', err);
  }
}

const selfCheckInSchema = z.object({ scannedGymId: z.string().uuid() });

// POST /api/attendance/check-in/self — member scans the gym's front-desk QR
// from their own Attendance tab.
async function checkInSelf(req, res, next) {
  try {
    const { scannedGymId } = selfCheckInSchema.parse(req.body);
    if (scannedGymId !== req.user.gymId) {
      return res.status(400).json({ message: "That QR code is for a different gym — make sure you're scanning your home gym's code." });
    }

    const activeMembership = await hasActiveMembership(req.user.id);
    if (!activeMembership) {
      return res.status(403).json({ message: 'You need an active membership to check in. Please renew to continue.' });
    }

    const alreadyIn = await attendanceModel.hasCheckedInToday(req.user.id);
    if (alreadyIn) {
      return res.status(409).json({ message: "You've already checked in today." });
    }

    const record = await attendanceModel.checkIn(req.user.id, 'self');
    await creditProgressLog(req.user.id, req.user.gymId);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ATTENDANCE_CHECKED_IN',
      targetType: 'attendance',
      targetId: record.id,
      metadata: { method: 'self' },
      ipAddress: req.ip,
    });

    res.status(201).json(record);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid QR code' });
    if (err.code === '23505') return res.status(409).json({ message: "You've already checked in today." });
    next(err);
  }
}

// POST /api/attendance/check-out/self — member taps "Check out" themselves.
async function checkOutSelf(req, res, next) {
  try {
    const record = await attendanceModel.checkOut(req.user.id, 'self');
    if (!record) {
      return res.status(400).json({ message: "You haven't checked in today, or you've already checked out." });
    }

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ATTENDANCE_CHECKED_OUT',
      targetType: 'attendance',
      targetId: record.id,
      metadata: { method: 'self' },
      ipAddress: req.ip,
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
}

const memberIdSchema = z.object({ userId: z.string().uuid() });

async function loadEligibleMember(req) {
  const { userId } = memberIdSchema.parse(req.body);
  const member = await userModel.findById(userId);
  if (!member || member.gym_id !== req.user.gymId) {
    return { error: { status: 404, message: 'Member not found at this gym' } };
  }
  if (member.role !== 'customer') {
    return { error: { status: 400, message: 'Only members can be checked in' } };
  }
  if (!member.is_active) {
    return { error: { status: 400, message: `${member.name}'s account is inactive` } };
  }
  return { member };
}

// POST /api/attendance/check-in — receptionist/admin manually checks a
// member in (for members who didn't bring their phone).
async function checkInManual(req, res, next) {
  try {
    const { member, error } = await loadEligibleMember(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const activeMembership = await hasActiveMembership(member.id);
    if (!activeMembership) {
      return res.status(403).json({ message: `${member.name} needs an active membership to check in.` });
    }

    const alreadyIn = await attendanceModel.hasCheckedInToday(member.id);
    if (alreadyIn) {
      return res.status(409).json({ message: `${member.name} has already checked in today` });
    }

    const record = await attendanceModel.checkIn(member.id, 'receptionist');
    await creditProgressLog(member.id, req.user.gymId);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ATTENDANCE_CHECKED_IN',
      targetType: 'attendance',
      targetId: record.id,
      metadata: { method: 'receptionist', memberId: member.id, memberName: member.name },
      ipAddress: req.ip,
    });

    res.status(201).json({ record, memberName: member.name });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    if (err.code === '23505') return res.status(409).json({ message: 'That member has already checked in today' });
    next(err);
  }
}

// POST /api/attendance/check-out — receptionist/admin manually checks a
// member out.
async function checkOutManual(req, res, next) {
  try {
    const { member, error } = await loadEligibleMember(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const record = await attendanceModel.checkOut(member.id, 'receptionist');
    if (!record) {
      return res.status(400).json({ message: `${member.name} isn't checked in right now.` });
    }

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ATTENDANCE_CHECKED_OUT',
      targetType: 'attendance',
      targetId: record.id,
      metadata: { method: 'receptionist', memberId: member.id, memberName: member.name },
      ipAddress: req.ip,
    });

    res.json({ record, memberName: member.name });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    next(err);
  }
}

// GET /api/attendance/me — customer's own attendance history
async function listMine(req, res, next) {
  try {
    const records = await attendanceModel.listByUser(req.user.id);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

// GET /api/attendance/today — receptionist/admin real-time view
async function listToday(req, res, next) {
  try {
    const records = await attendanceModel.listTodayForGym(req.user.gymId);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

module.exports = { checkInSelf, checkOutSelf, checkInManual, checkOutManual, listMine, listToday, runCatchUp };
