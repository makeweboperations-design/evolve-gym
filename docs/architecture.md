# Architecture Notes

## Entities (see backend/src/database/schema.sql for full DDL)

gyms → users → memberships → membership_plans
users → payments, attendance, workout_plans, diet_plans, notifications
audit_logs (independent, references actor by id but not FK-constrained)
chatbot_faqs (per-gym FAQ set)

## Multi-tenancy approach

Every gym-specific row carries `gym_id`. For the MVP (one gym), this is mostly unused,
but it means turning this into a true multi-tenant SaaS later is a matter of:
- Adding gym selection at signup/login
- Filtering all queries by `req.user.gymId`
- Building a "branding" settings page (logo, colors, description) admins can edit per gym

## Auth flow

1. `POST /api/auth/register` → creates a `customer` (public) or any role if called by an authenticated admin
2. `POST /api/auth/login` → returns access token (short-lived) + refresh token (longer-lived)
3. Frontend stores tokens, attaches access token as `Authorization: Bearer <token>`
4. On 401, frontend calls `/api/auth/refresh` once, retries original request
5. Backend `requireAuth` verifies JWT; `requireRole(...)` enforces RBAC per route

## Audit logging

Any controller that performs a write (create/update/delete) on a sensitive entity
(users, payments, memberships, plans) should call `auditLog.record(...)` after the
operation succeeds. Logs are queryable by admins for compliance/debugging.

## Next steps for this doc

- [ ] Add ER diagram (draw.io / dbdiagram.io export)
- [ ] Document REST API contract (endpoints, request/response shapes) — consider OpenAPI/Swagger
- [ ] Document notification cron schedule and channels
