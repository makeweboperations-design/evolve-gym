# Gym Management SaaS

Multi-tenant web (and future mobile) platform for gym management: attendance, memberships,
payments, trainer-assigned workout/diet plans, notifications, and a public brand/marketing site.

## Structure

```
gym-management-saas/
├── backend/            Node.js + Express + PostgreSQL API
├── frontend/           React (Vite) web app — public site + role-based dashboards
├── mobile/             React Native app (placeholder, built after web MVP)
├── docs/               Architecture notes, ER diagrams, API contracts
└── README.md
```

## Roles

- **Admin** — gym config, staff management, plans/pricing, reports
- **Receptionist** — attendance, membership renewals, payment status
- **Trainer** — assign/update workout & diet plans, view assigned customers
- **Customer** — register/login, attendance, payments, view plans, calendar, notifications

## Getting started

See `backend/README.md` and `frontend/README.md` for setup instructions specific to each app.

Quick start (once both are set up):

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

## Environment

Copy `.env.example` to `.env` in both `backend/` and `frontend/` and fill in values
(database URL, JWT secret, payment gateway keys, etc.) — never commit real `.env` files.

## Build order (recommended)

1. Backend: DB schema + auth + RBAC middleware
2. Frontend: public marketing site (landing page)
3. Admin + Receptionist flows
4. Trainer + Customer flows
5. Payments + notifications
6. Chatbot + polish
7. Security hardening + testing
8. Deploy first client (the gym), then generalize for multi-tenant reuse
