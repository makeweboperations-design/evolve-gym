# Frontend — Gym SaaS Web App

React + Vite, React Router for routing, Axios for API calls.

## Setup

```bash
npm install
cp .env.example .env    # set VITE_API_BASE_URL
npm run dev             # http://localhost:5173
```

## Structure

```
src/
├── pages/
│   ├── public/       Home (landing/brand page), Login, Register
│   ├── admin/        Admin dashboard
│   ├── receptionist/ Receptionist dashboard
│   ├── trainer/      Trainer dashboard
│   └── customer/     Customer dashboard
├── components/       Shared/reusable UI (ProtectedRoute, Navbar, Cards, Modals...)
├── context/          AuthContext (current user, login/logout)
├── services/         api.js (Axios instance with token + refresh handling)
├── hooks/            Custom hooks (useAttendance, useMemberships, etc. as you build them)
├── utils/             Helpers (formatters, validators)
└── App.jsx / main.jsx
```

## Build order

1. Public `Home` page (brand/marketing — services, gallery, trainers, pricing, location, contact)
2. Login/Register wired to backend `/api/auth`
3. Admin dashboard: staff, plans, gym branding settings
4. Receptionist dashboard: attendance (QR), renewals, payment status
5. Trainer dashboard: workout/diet plan builder, assigned customers
6. Customer dashboard: plans view, attendance/payment history, calendar, notifications, chatbot widget

Each dashboard is routed under `/admin`, `/receptionist`, `/trainer`, `/dashboard` and protected
by `<ProtectedRoute roles={[...]}>` — matching the backend's RBAC middleware.
