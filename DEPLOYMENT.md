# Evolve Gym — Setup & Deployment Guide

Everything below is exact steps for **your end** — I can't push to GitHub,
create cloud accounts, or click deploy buttons for you (no internet access
in my sandbox), so this is the precise sequence to run the whole thing live.

---

## 1. Push the code to a new GitHub repo

The code here already has a fresh git history with one commit:
`Initial commit: Evolve Gym rebrand (design, branding, logo)`.

1. Go to https://github.com/new
2. Repository name: `evolve-gym` (or whatever you like)
3. **Do not** check "Add a README" / .gitignore / license — this repo
   already has all of that. Leave it fully empty.
4. Click **Create repository**. GitHub will show you a page with a URL like
   `https://github.com/<your-username>/evolve-gym.git` — copy it.
5. Download the code (link below this message) and unzip it, then in a
   terminal, inside the unzipped folder, run:

   ```bash
   git remote add origin https://github.com/<your-username>/evolve-gym.git
   git push -u origin main
   ```

That's it — the repo is live on GitHub.

---

## 2. Set up the new Supabase project (database)

1. Go to https://supabase.com/dashboard (log in to your existing account)
2. Click **New project**
3. Name: `evolve-gym`, pick a strong database password (save it somewhere
   safe — you'll need it in step 2b), pick the region closest to Kolkata
   (e.g. `ap-south-1` / Mumbai)
4. Once the project finishes provisioning (~2 min), go to
   **Project Settings → Database → Connection string → URI**. Copy it —
   it looks like:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with the password from step 3. This full
   string is your `DATABASE_URL`.

### 2b. Run the schema + seed against it

On your machine, inside `backend/`:

```bash
cd backend
npm install
echo "DATABASE_URL=<paste your connection string here>" > .env
npm run migrate
npm run seed
```

`npm run seed` creates:
- The Evolve Gym tenant record
- An admin login: **admin@evolvegym.example / ChangeMe123!** (change this
  password immediately after your first login — or edit
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding)
- 3 starter membership plans (Monthly / Quarterly / Annual+PT — edit
  prices in `backend/src/database/seed.js` to match what you actually
  want to charge)
- The chatbot FAQ set

---

## 3. Deploy the backend to Render

1. Go to https://dashboard.render.com and log in / sign up
2. Click **New → Blueprint**, connect your GitHub account, and select the
   `evolve-gym` repo you pushed in step 1. Render will detect
   `render.yaml` at the repo root automatically and pre-fill the service.
3. On the setup screen, fill in the values marked `sync: false`:
   - `DATABASE_URL` → the Supabase connection string from step 2
   - `CLIENT_ORIGIN` → leave blank for now, you'll fill this in after step 4
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` → leave blank until you set
     up Razorpay (you said this comes later)
   - `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` → from your existing
     SendGrid account (see step 5 below for the one thing you need to add
     there)
   - Twilio vars → leave blank if you're not using WhatsApp notifications
4. Click **Apply**. Render will build and deploy — first deploy takes
   ~3–5 minutes. When it's done you'll get a URL like
   `https://evolve-gym-backend.onrender.com`
5. Note: on Render's free plan the backend sleeps after 15 minutes of no
   traffic and takes ~30–50s to wake up on the next request. Fine for
   testing; upgrade to a paid instance before real launch if that matters.

---

## 4. Deploy the frontend to Vercel

1. Go to https://vercel.com and log in / sign up, connect GitHub
2. Click **Add New → Project**, select the `evolve-gym` repo
3. Vercel should auto-detect Vite. Set:
   - **Root Directory**: `frontend`
   - **Build command**: `npm run build` (default, should already be set)
   - **Output directory**: `dist` (default)
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://evolve-gym-backend.onrender.com/api`
     (your Render URL from step 3, plus `/api`)
5. Click **Deploy**. You'll get a URL like `https://evolve-gym.vercel.app`

### 4b. Close the loop
Go back to Render → your backend service → Environment, and set
`CLIENT_ORIGIN` to your new Vercel URL (`https://evolve-gym.vercel.app`),
then trigger a redeploy. This is what makes CORS allow your frontend to
actually talk to the backend.

---

## 5. SendGrid — reusing your existing account

You don't need a new account. In SendGrid:
1. Go to **Settings → Sender Authentication**
2. Add and verify a new sender identity for Evolve Gym, e.g.
   `notifications@evolvegym.example` (or your real domain once you have one)
3. Use that address as `SENDGRID_FROM_EMAIL` in Render's env vars (step 3)
4. Your existing `SENDGRID_API_KEY` works as-is — SendGrid keys aren't
   tied to one sender/project.

---

## 6. Domain (once you have one)

- **Vercel**: Project → Settings → Domains → add your domain, follow the
  DNS records Vercel shows you.
- **Render**: Service → Settings → Custom Domains → add e.g.
  `api.evolvegym.com`, follow the DNS records shown.
- Update `VITE_API_BASE_URL` (Vercel) and `CLIENT_ORIGIN` (Render) to the
  new domains and redeploy both.

---

## 7. Razorpay (when you're ready)

1. Create/log into your Razorpay account, go to **Settings → API Keys**,
   generate a Key ID + Key Secret (use **Test Mode** keys first)
2. Add them as `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in Render's env
   vars and redeploy
3. Switch to live keys only once you've tested a full payment flow

---

## 8. Adding real photos later

Every photo slot in the site currently renders a branded placeholder
(diagonal red/black stripes) because no image files exist yet. To add a
real one:

1. Drop the file into the matching folder, e.g.
   `frontend/src/assets/trainers/santanu.jpg`
2. Open `frontend/src/pages/public/Home.jsx`, add an import at the top:
   `import santanuPhoto from '../../assets/trainers/santanu.jpg';`
3. Set `photoUrl: santanuPhoto` on that trainer's entry in the `TRAINERS`
   array (same pattern for `SERVICES`, `GALLERY_ITEMS`, and
   `components/landing/CommunityShowcase.jsx`'s `MOMENTS` array)
4. Commit, push — Vercel redeploys automatically on every push to `main`.

No other code changes needed — the pixelate-in photo effect just starts
working on that card.
