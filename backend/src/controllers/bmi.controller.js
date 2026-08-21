const { z } = require('zod');
const bmiModel = require('../models/bmi.model');
const auditLog = require('../services/auditLog.service');

const bmiSchema = z.object({
  heightCm: z.number().positive().max(300),
  weightKg: z.number().positive().max(400),
});

function categoryFor(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// POST /api/bmi/calculate — works for visitors (req.user undefined) and
// logged-in members (req.user set via optionalAuth). Only saves when logged in.
async function calculate(req, res, next) {
  try {
    const { heightCm, weightKg } = bmiSchema.parse(req.body);
    const heightM = heightCm / 100;
    const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    const category = categoryFor(bmi);

    let saved = false;
    if (req.user?.id) {
      await bmiModel.saveResult({ userId: req.user.id, heightCm, weightKg, bmi, category });
      saved = true;

      await auditLog.record({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'BMI_RESULT_SAVED',
        targetType: 'bmi_log',
        metadata: { bmi, category },
        ipAddress: req.ip,
      });
    }

    res.json({ bmi, category, saved });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    next(err);
  }
}

// GET /api/bmi/history — logged-in members only, requireAuth used on the route.
async function history(req, res, next) {
  try {
    const logs = await bmiModel.listByUser(req.user.id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { calculate, history };
