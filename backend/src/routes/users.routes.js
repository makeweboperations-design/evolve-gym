const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const roles = require('../config/roles');
const usersController = require('../controllers/users.controller');

// Memory storage — the file never touches disk, just gets forwarded straight
// to Supabase Storage as a buffer. 5MB cap is plenty for a profile photo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/me', requireAuth, usersController.getMe);
router.patch('/me', requireAuth, usersController.updateMe);
router.post('/me/photo', requireAuth, upload.single('photo'), usersController.uploadPhoto);
router.post('/me/change-password', requireAuth, usersController.changePassword);
router.get('/', requireAuth, requireRole(roles.ADMIN, roles.RECEPTIONIST, roles.TRAINER), usersController.list);
router.patch('/:id', requireAuth, requireRole(roles.ADMIN), usersController.updateRoleAndStatus);

module.exports = router;
