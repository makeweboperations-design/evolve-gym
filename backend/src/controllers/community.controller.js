const { z } = require('zod');
const communityModel = require('../models/community.model');
const { supabaseStorage } = require('../config/supabaseStorage');
const auditLog = require('../services/auditLog.service');

const COMMUNITY_BUCKET = 'community-media';

const postSchema = z.object({
  type: z.enum(['general', 'progress', 'notice']).default('general'),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
});

// Chat messages can be image-only, so content isn't strictly required —
// but at least one of content/imageUrl must be present (checked below).
const messageSchema = z.object({
  content: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const editSchema = z.object({
  content: z.string().min(1).max(2000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

// WhatsApp-style edit window: 15 minutes after sending.
const EDIT_WINDOW_MS = 15 * 60 * 1000;

function canModerate(user) {
  return user.role === 'admin';
}

function withinEditWindow(createdAt) {
  return Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}

// GET /api/community/feed — real posts, including auto-generated birthday
// posts (created once per person per day so they're real, commentable rows).
async function getFeed(req, res, next) {
  try {
    const gymId = req.user.gymId;
    await communityModel.ensureTodaysBirthdayPosts(gymId);
    const posts = await communityModel.listPosts(gymId);
    res.json(posts);
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const data = postSchema.parse(req.body);

    if (data.type === 'notice' && !['admin', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only staff can post a notice' });
    }

    const post = await communityModel.createPost({
      gymId: req.user.gymId,
      userId: req.user.id,
      type: data.type,
      content: data.content,
      imageUrl: data.imageUrl,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: data.type === 'notice' ? 'COMMUNITY_NOTICE_POSTED' : 'COMMUNITY_POST_CREATED',
      targetType: 'community_post',
      targetId: post.id,
      metadata: { type: data.type },
      ipAddress: req.ip,
    });

    res.status(201).json(post);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// Only the post's author OR an admin (moderation) can delete it.
async function removePost(req, res, next) {
  try {
    const post = await communityModel.getPostById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.user_id !== req.user.id && !canModerate(req.user)) {
      return res.status(403).json({ message: 'Only the author or an admin can delete this post' });
    }

    await communityModel.deletePost(req.params.id);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: post.user_id !== req.user.id ? 'COMMUNITY_POST_DELETED_BY_ADMIN' : 'COMMUNITY_POST_DELETED',
      targetType: 'community_post',
      targetId: req.params.id,
      metadata: { originalAuthorId: post.user_id },
      ipAddress: req.ip,
    });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

// Only the post's author can edit it, and only within the edit window.
async function editPost(req, res, next) {
  try {
    const post = await communityModel.getPostById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the author can edit this post' });
    }
    if (!withinEditWindow(post.created_at)) {
      return res.status(403).json({ message: 'This post can no longer be edited (15-minute window has passed)' });
    }

    const data = editSchema.parse(req.body);
    const updated = await communityModel.updatePostContent(req.params.id, data.content);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'COMMUNITY_POST_EDITED',
      targetType: 'community_post',
      targetId: req.params.id,
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

// Toggle an emoji reaction on a post (WhatsApp-style: tap again to remove,
// tap a different emoji to switch).
async function reactToPost(req, res, next) {
  try {
    const post = await communityModel.getPostById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const data = reactionSchema.parse(req.body);
    await communityModel.toggleReaction({
      targetType: 'post',
      targetId: req.params.id,
      userId: req.user.id,
      emoji: data.emoji,
    });

    const reactions = await communityModel.listReactionsForTarget('post', req.params.id);
    res.json(reactions);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// --- Comments (anyone in the gym can comment on any post, including
//     birthday shout-outs and progress updates) ---

async function getComments(req, res, next) {
  try {
    const comments = await communityModel.listComments(req.params.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function postComment(req, res, next) {
  try {
    const data = commentSchema.parse(req.body);
    const comment = await communityModel.addComment({
      postId: req.params.id,
      userId: req.user.id,
      content: data.content,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'COMMUNITY_COMMENT_CREATED',
      targetType: 'community_comment',
      targetId: comment.id,
      metadata: { postId: req.params.id },
      ipAddress: req.ip,
    });

    res.status(201).json(comment);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// --- Shared gym chat ---

async function getMessages(req, res, next) {
  try {
    const messages = await communityModel.listMessages(req.user.gymId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function postMessage(req, res, next) {
  try {
    const data = messageSchema.parse(req.body);

    if (!data.content?.trim() && !data.imageUrl) {
      return res.status(400).json({ message: 'A message needs text or an image' });
    }

    const message = await communityModel.createMessage({
      gymId: req.user.gymId,
      userId: req.user.id,
      content: data.content,
      imageUrl: data.imageUrl,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CHAT_MESSAGE_SENT',
      targetType: 'community_message',
      targetId: message.id,
      ipAddress: req.ip,
    });

    res.status(201).json(message);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// Only the message's author can edit it, and only within the edit window.
async function editMessage(req, res, next) {
  try {
    const message = await communityModel.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the sender can edit this message' });
    }
    if (!withinEditWindow(message.created_at)) {
      return res.status(403).json({ message: 'This message can no longer be edited (15-minute window has passed)' });
    }

    const data = editSchema.parse(req.body);
    const updated = await communityModel.updateMessageContent(req.params.id, data.content);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CHAT_MESSAGE_EDITED',
      targetType: 'community_message',
      targetId: req.params.id,
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

// Toggle an emoji reaction on a chat message.
async function reactToMessage(req, res, next) {
  try {
    const message = await communityModel.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const data = reactionSchema.parse(req.body);
    await communityModel.toggleReaction({
      targetType: 'message',
      targetId: req.params.id,
      userId: req.user.id,
      emoji: data.emoji,
    });

    const reactions = await communityModel.listReactionsForTarget('message', req.params.id);
    res.json(reactions);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// Only the message's author OR an admin (moderation) can delete it.
async function removeMessage(req, res, next) {
  try {
    const message = await communityModel.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.user_id !== req.user.id && !canModerate(req.user)) {
      return res.status(403).json({ message: 'Only the sender or an admin can delete this message' });
    }

    await communityModel.deleteMessage(req.params.id);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: message.user_id !== req.user.id ? 'CHAT_MESSAGE_DELETED_BY_ADMIN' : 'CHAT_MESSAGE_DELETED',
      targetType: 'community_message',
      targetId: req.params.id,
      metadata: { originalSenderId: message.user_id },
      ipAddress: req.ip,
    });

    res.json({ message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
}

// --- Image upload, shared by feed posts and chat messages ---
// multer memory storage puts the file on req.file — see community.routes.js.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was uploaded' });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Image must be a JPEG, PNG, or WebP file' });
    }

    const ext = req.file.mimetype.split('/')[1];
    const path = `${req.user.gymId}/${req.user.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from(COMMUNITY_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) {
      console.error('Supabase Storage upload failed (community):', uploadError);
      return res.status(502).json({ message: 'Could not upload image — please try again' });
    }

    const { data } = supabaseStorage.storage.from(COMMUNITY_BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFeed,
  createPost,
  editPost,
  reactToPost,
  removePost,
  getComments,
  postComment,
  getMessages,
  postMessage,
  editMessage,
  reactToMessage,
  removeMessage,
  uploadImage,
};
