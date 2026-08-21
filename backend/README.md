# Backend — Gym SaaS API

Node.js + Express + PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL, JWT secrets, etc.
npm run migrate         # applies schema.sql to your database
npm run dev             # starts on http://localhost:5000
```

## Structure

```
src/
├── config/       db connection, roles constants
├── controllers/  request handlers (business logic entry point)
├── models/       raw SQL queries per entity
├── routes/       express routers, wired to controllers
├── middleware/   auth (JWT + RBAC), error handler
├── services/     cross-cutting logic (audit log, notifications, payments)
├── jobs/         scheduled tasks (renewal reminders, etc.)
├── database/     schema.sql + migration runner
├── validators/   (optional) zod/joi schemas if you split them out of controllers
└── app.js / server.js
```

## Pattern to follow for each new module (e.g. "memberships")

1. `models/membership.model.js` — SQL queries
2. `controllers/memberships.controller.js` — validates input, calls model, calls `auditLog.record(...)` on writes
3. `routes/memberships.routes.js` — wires `requireAuth` + `requireRole(...)` + controller functions
4. Register the router in `app.js`

The `auth` module (already built) is the reference implementation for this pattern.

## Security notes

- Passwords hashed with bcrypt (cost 12)
- JWT access token (short-lived) + refresh token (longer-lived)
- `requireAuth` + `requireRole` middleware enforce RBAC server-side — never trust the frontend to hide UI as your only protection
- Rate limiting on `/api/auth/*`
- Never store raw card data — payment gateway (Razorpay/Stripe) handles that; we only store `gateway_payment_id`
- All writes to sensitive tables should call `auditLog.record(...)`
