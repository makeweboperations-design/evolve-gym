const userModel = require('../models/user.model');
const auditLog = require('../services/auditLog.service');
const roles = require('../config/roles');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { supabaseStorage, AVATAR_BUCKET } = require('../config/supabaseStorage');

// Example: a logged-in user fetching their own profile
async function getMe(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

// Admin/receptionist: list users in the gym, optionally filtered by role
// e.g. GET /api/users?role=customer or ?role=trainer
async function list(req, res, next) {
  try {
    // Trainers only need (and should only see) customers here — admins and
    // receptionists can see any role, including other staff.
    const roleFilter = req.user.role === roles.TRAINER ? roles.CUSTOMER : req.query.role;
    const users = await userModel.listByGym(req.user.gymId, roleFilter);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// Admin only: change a user's role (e.g. promote to trainer) or active status
async function updateRoleAndStatus(req, res, next) {
  try {
    const { role, isActive } = req.body;
    const updated = await userModel.updateRoleAndStatus(req.params.id, req.user.gymId, { role, isActive });
    if (!updated) return res.status(404).json({ message: 'User not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_ROLE_OR_STATUS_UPDATED',
      targetType: 'user',
      targetId: updated.id,
      metadata: { role, isActive },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  dateOfBirth: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
});

// Logged-in user editing their own profile — no role/status change allowed here.
async function updateMe(req, res, next) {
  try {
    const data = updateMeSchema.parse(req.body);
    const updated = await userModel.updateProfile(req.user.id, {
      name: data.name,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      profilePhotoUrl: data.profilePhotoUrl,
    });
    if (!updated) return res.status(404).json({ message: 'User not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_PROFILE_UPDATED',
      targetType: 'user',
      targetId: req.user.id,
      metadata: { fields: Object.keys(req.body) },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userModel.updatePasswordHash(req.user.id, passwordHash);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_PASSWORD_CHANGED',
      targetType: 'user',
      targetId: req.user.id,
      ipAddress: req.ip,
    });

    res.json({ message: 'Password updated' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// Logged-in user uploading a profile photo file (not a pasted URL).
// multer (memory storage) puts the raw file on req.file — see users.routes.js.
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file was uploaded' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Photo must be a JPEG, PNG, or WebP image' });
    }

    const ext = req.file.mimetype.split('/')[1];
    const path = `users/${req.user.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from(AVATAR_BUCKET)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Storage upload failed:', uploadError);
      return res.status(502).json({ message: 'Could not upload photo — please try again' });
    }

    const { data: publicUrlData } = supabaseStorage.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    const updated = await userModel.updateProfile(req.user.id, {
      profilePhotoUrl: publicUrlData.publicUrl,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_PHOTO_UPLOADED',
      targetType: 'user',
      targetId: req.user.id,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, list, updateRoleAndStatus, updateMe, changePassword, uploadPhoto };
