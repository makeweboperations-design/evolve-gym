const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireActive } = require('../middleware/auth');
const controller = require('../controllers/community.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Deactivated members can log in but cannot use the community feed/chat at all.
router.use(requireAuth, requireActive);

router.get('/feed', controller.getFeed);
router.post('/posts', controller.createPost);
router.put('/posts/:id', controller.editPost);
router.delete('/posts/:id', controller.removePost);
router.post('/posts/:id/react', controller.reactToPost);

router.get('/posts/:id/comments', controller.getComments);
router.post('/posts/:id/comments', controller.postComment);

router.get('/messages', controller.getMessages);
router.post('/messages', controller.postMessage);
router.put('/messages/:id', controller.editMessage);
router.delete('/messages/:id', controller.removeMessage);
router.post('/messages/:id/react', controller.reactToMessage);

// Shared by both the feed composer and the chat box — uploads an image and
// returns its public URL, which is then sent along with the post/message.
router.post('/upload-image', upload.single('image'), controller.uploadImage);

module.exports = router;
