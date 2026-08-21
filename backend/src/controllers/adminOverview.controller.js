const overviewModel = require('../models/adminOverview.model');
const membershipPlanModel = require('../models/membershipPlan.model');
const userModel = require('../models/user.model');
const attendanceModel = require('../models/attendance.model');

// GET /api/admin/overview — one combined payload for the enhanced admin
// dashboard, so the frontend doesn't have to fire off a dozen requests.
async function getOverview(req, res, next) {
  try {
    const gymId = req.user.gymId;

    const [users, membership, expiringSoon, revenue, attendanceToday, attendanceTrend, equipmentIssues, recentSignups, plans, pendingApproval, currentlyInside] =
      await Promise.all([
        overviewModel.getUserCounts(gymId),
        overviewModel.getMembershipBreakdown(gymId),
        overviewModel.getExpiringSoon(gymId),
        overviewModel.getRevenue(gymId),
        overviewModel.getAttendanceToday(gymId),
        overviewModel.getAttendanceTrend(gymId),
        overviewModel.getEquipmentIssues(gymId),
        overviewModel.getRecentSignups(gymId),
        membershipPlanModel.listByGym(gymId),
        userModel.listPendingApproval(gymId),
        attendanceModel.getActiveCountForGym(gymId),
      ]);

    res.json({
      users,
      membership,
      expiringSoon,
      revenue,
      attendanceToday,
      currentlyInside,
      attendanceTrend,
      equipmentIssues,
      recentSignups,
      planCount: plans.length,
      pendingApproval,
    });
  } catch (err) {
    console.error('GET /api/admin/overview failed:', err);
    next(err);
  }
}

module.exports = { getOverview };
