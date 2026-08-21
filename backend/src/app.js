const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const membershipPlanRoutes = require('./routes/membershipPlans.routes');
const membershipRoutes = require('./routes/memberships.routes');
const workoutPlanRoutes = require('./routes/workoutPlans.routes');
const dietPlanRoutes = require('./routes/dietPlans.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const paymentRoutes = require('./routes/payments.routes');
const notificationRoutes = require('./routes/notifications.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const auditLogRoutes = require('./routes/auditLogs.routes');
const communityRoutes = require('./routes/community.routes');
const bmiRoutes = require('./routes/bmi.routes');
const progressRoutes = require('./routes/progress.routes');
const equipmentRoutes = require('./routes/equipment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminOverviewRoutes = require('./routes/adminOverview.routes');
const jobsRoutes = require('./routes/jobs.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Render, Railway, Vercel, etc. all sit behind a reverse proxy — trust the
// first hop so express-rate-limit and req.ip see the real client IP instead
// of erroring on the X-Forwarded-For header.
app.set('trust proxy', 1);

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limit auth endpoints hard, general API more loosely
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/membership-plans', membershipPlanRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/workout-plans', workoutPlanRoutes);
app.use('/api/diet-plans', dietPlanRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/bmi', bmiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminOverviewRoutes);
app.use('/api/jobs', jobsRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
