const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const userModel = require('../models/user.model');
const roles = require('../config/roles');
const auditLog = require('../services/auditLog.service');
const notificationService = require('../services/notification.service');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).optional(),
  dateOfBirth: z.string().optional(), // 'YYYY-MM-DD', optional — powers birthday posts in Community
  role: z.enum([roles.ADMIN, roles.RECEPTIONIST, roles.TRAINER, roles.CUSTOMER]).default(roles.CUSTOMER),
  gymId: z.string().uuid(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signTokens(user) {
  const payload = { id: user.id, role: user.role, gymId: user.gym_id };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await userModel.findByEmail(data.email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Public self-registration should only ever create customers.
    // Staff accounts (admin/trainer/receptionist) should be created by an
    // already-authenticated admin via a separate protected endpoint.
    const role = req.user?.role === roles.ADMIN ? data.role : roles.CUSTOMER;

    // New members who sign up themselves start deactivated — they can log
    // in and see their account is pending, but every other feature
    // (community, progress tracker, plans, etc.) stays locked until an
    // admin approves them. Staff created by an admin go active right away.
    const isActive = role !== roles.CUSTOMER || req.user?.role === roles.ADMIN;

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userModel.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role,
      gymId: data.gymId,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      isActive,
    });

    await auditLog.record({
      actorId: user.id,
      actorRole: role,
      action: 'USER_REGISTERED',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
    });

    // Let the gym's admins know a new member is waiting for approval.
    if (!isActive) {
      try {
        const admins = await userModel.listAdmins(data.gymId);
        await Promise.all(
          admins.map((admin) =>
            notificationService.notify({
              userId: admin.id,
              userEmail: admin.email,
              userName: admin.name,
              type: 'NEW_MEMBER_PENDING',
              subject: 'New member awaiting approval',
              message: `${user.name} just signed up and is waiting for approval before they can use community, the progress tracker, and other features. Approve them from Staff & Members.`,
            })
          )
        );
      } catch (notifyErr) {
        console.error('Failed to notify admins of new pending member:', notifyErr);
      }
    }

    const tokens = signTokens(user);
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Deliberately vague message — don't reveal whether email exists.
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = signTokens(user);

    await auditLog.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      targetType: 'user',
      targetId: user.id,
      ipAddress: req.ip,
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, ...tokens });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userModel.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    const tokens = signTokens(user);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

module.exports = { register, login, refresh };
