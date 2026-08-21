const crypto = require('crypto');
const { z } = require('zod');

const razorpayService = require('../services/razorpay.service');
const paymentModel = require('../models/payment.model');
const planModel = require('../models/membershipPlan.model');
const membershipModel = require('../models/membership.model');
const auditLog = require('../services/auditLog.service');

const createOrderSchema = z.object({ planId: z.string().uuid() });

// POST /api/payments/create-order — customer picks a plan, we open a Razorpay order
async function createOrder(req, res, next) {
  try {
    const { planId } = createOrderSchema.parse(req.body);

    const plans = await planModel.listByGym(req.user.gymId);
    const plan = plans.find((p) => p.id === planId && p.is_active);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const order = await razorpayService.createOrder({
      amountInRupees: Number(plan.price),
      receipt: `user_${req.user.id}_${Date.now()}`,
    });

    const payment = await paymentModel.create({
      userId: req.user.id,
      planId: plan.id,
      amount: plan.price,
      orderId: order.id,
    });

    res.status(201).json({
      orderId: order.id,
      amount: order.amount, // in paise, what Razorpay Checkout expects
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentRecordId: payment.id,
      planName: plan.name,
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    next(err);
  }
}

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

// POST /api/payments/verify — called after Razorpay Checkout succeeds client-side.
// We NEVER trust the client's "it worked" — we recompute the signature ourselves.
async function verify(req, res, next) {
  try {
    const data = verifySchema.parse(req.body);

    const payment = await paymentModel.findByOrderId(data.razorpay_order_id);
    if (!payment || payment.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    if (payment.status === 'success') {
      return res.json({ message: 'Already processed' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== data.razorpay_signature) {
      await paymentModel.markFailed(payment.id);
      await auditLog.record({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'PAYMENT_SIGNATURE_INVALID',
        targetType: 'payment',
        targetId: payment.id,
        ipAddress: req.ip,
      });
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Signature is valid — apply the membership. Renew if one exists, else create fresh.
    const plans = await planModel.listByGym(req.user.gymId);
    const plan = plans.find((p) => p.id === payment.plan_id);

    const existing = await membershipModel.getForUser(req.user.id);
    let membership;
    if (existing) {
      membership = await membershipModel.renew(existing.membership_id, req.user.gymId, plan.duration_days);
    } else {
      membership = await membershipModel.create({
        userId: req.user.id,
        planId: plan.id,
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: plan.duration_days,
      });
    }

    const updatedPayment = await paymentModel.markSuccess(payment.id, {
      gatewayPaymentId: data.razorpay_payment_id,
      membershipId: membership.id,
    });

    await auditLog.record({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_SUCCEEDED',
      targetType: 'payment',
      targetId: payment.id,
      metadata: { planId: plan.id, amount: payment.amount },
      ipAddress: req.ip,
    });

    res.json({ payment: updatedPayment, membership });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Invalid input' });
    next(err);
  }
}

// GET /api/payments/me — customer's own payment history
async function listMine(req, res, next) {
  try {
    const payments = await paymentModel.listByUser(req.user.id);
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, verify, listMine };
