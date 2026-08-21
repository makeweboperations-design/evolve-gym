const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const membershipModel = require('../models/membership.model');

// Verifies the access token and attaches { id, role, gymId } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload; // { id, role, gymId }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Usage: requireRole('admin', 'receptionist')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// Attaches req.user if a valid token is present, but never blocks the
// request — used for routes visitors AND logged-in members can both hit
// (e.g. the public BMI calculator, which only saves a result if logged in).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    // Invalid/expired token on an optional route — just proceed as a guest.
  }
  next();
}

// Deactivated members can still log in (so they can be told why, or contact
// the gym) but are blocked from every other feature: community, progress
// tracker, plans, bmi, attendance, etc. Must run after requireAuth.
async function requireActive(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (!user.is_active) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact the gym front desk.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Gates a feature (currently just the progress tracker) behind having a
// currently-valid membership. Must run after requireAuth.
async function requireActiveMembership(req, res, next) {
  try {
    const membership = await membershipModel.getForUser(req.user.id);
    const status = membership?.computed_status;
    if (!membership || !['active', 'expiring_soon'].includes(status)) {
      return res.status(403).json({
        message: 'Unavailable — renew your membership to use this feature.',
        code: 'MEMBERSHIP_REQUIRED',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireRole, optionalAuth, requireActive, requireActiveMembership };
