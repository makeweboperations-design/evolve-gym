const { z } = require('zod');
const faqModel = require('../models/chatbotFaq.model');
const auditLog = require('../services/auditLog.service');

const upsertSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(1),
  category: z.string().optional(),
});

async function list(req, res, next) {
  try {
    const faqs = await faqModel.listByGym(req.user.gymId);
    res.json(faqs);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = upsertSchema.parse(req.body);
    const faq = await faqModel.create({ gymId: req.user.gymId, ...data });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CHATBOT_FAQ_CREATED',
      targetType: 'chatbot_faq',
      targetId: faq.id,
      ipAddress: req.ip,
    });

    res.status(201).json(faq);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = upsertSchema.partial().parse(req.body);
    const faq = await faqModel.update(req.params.id, req.user.gymId, data);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CHATBOT_FAQ_UPDATED',
      targetType: 'chatbot_faq',
      targetId: faq.id,
      ipAddress: req.ip,
    });

    res.json(faq);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await faqModel.remove(req.params.id, req.user.gymId);

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CHATBOT_FAQ_DELETED',
      targetType: 'chatbot_faq',
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Public-ish (any logged-in user): ask a question, get best-matching FAQs.
const askSchema = z.object({ message: z.string().min(1) });

async function ask(req, res, next) {
  try {
    const { message } = askSchema.parse(req.body);
    const matches = await faqModel.search(req.user.gymId, message);
    res.json({ matches });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    next(err);
  }
}

// --- Public versions, for visitors on the landing page (no login yet) ---
// Both require a ?gymId=... query param since there's no session to read
// gymId from. The frontend hardcodes the same gym UUID it uses for
// registration.
const publicQuerySchema = z.object({ gymId: z.string().uuid() });

async function publicList(req, res, next) {
  try {
    const { gymId } = publicQuerySchema.parse(req.query);
    const faqs = await faqModel.listByGym(gymId);
    res.json(faqs);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Missing or invalid gymId' });
    next(err);
  }
}

async function publicAsk(req, res, next) {
  try {
    const { gymId } = publicQuerySchema.parse(req.query);
    const { message } = askSchema.parse(req.body);
    const matches = await faqModel.search(gymId, message);
    res.json({ matches });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    next(err);
  }
}

module.exports = { list, create, update, remove, ask, publicList, publicAsk };
