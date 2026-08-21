// Seeds a single gym tenant end-to-end: the gym record itself, one admin
// login you can actually sign in with, three starter membership plans, and
// the chatbot FAQ set. Safe to re-run — every insert is guarded so it
// won't create duplicates.
//
// Run with: npm run seed   (after `npm run migrate`)
//
// Change ADMIN_EMAIL / ADMIN_PASSWORD below (or set them as env vars)
// before running against a real/production database.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const GYM_NAME = process.env.SEED_GYM_NAME || 'Evolve Gym';
const GYM_SLUG = process.env.SEED_GYM_SLUG || 'evolve-gym';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@evolvegym.example';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

async function seed() {
  try {
    // 1. Gym tenant record
    const gymRes = await db.query(
      `INSERT INTO gyms (name, slug, address, phone, email, brand_primary_color, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        GYM_NAME,
        GYM_SLUG,
        'Chiriamore, Baranagar, Belgharia, Ariadaha, Dakshineswar',
        '8240122675',
        'hello@evolvegym.example',
        '#E60000',
        'Real training. Real strength. Real results.',
      ]
    );
    const gymId = gymRes.rows[0].id;
    console.log(`Gym ready: ${GYM_NAME} (${gymId})`);

    // 2. Admin login
    const existingAdmin = await db.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.query(
        `INSERT INTO users (gym_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin')`,
        [gymId, 'Evolve Gym Admin', ADMIN_EMAIL, passwordHash]
      );
      console.log(`Admin login created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  <-- change this password after first login`);
    } else {
      console.log(`Admin login already exists: ${ADMIN_EMAIL}`);
    }

    // 3. Starter membership plans
    const plans = [
      ['Monthly', 30, 1500, 'Full gym access, billed monthly.'],
      ['Quarterly', 90, 4000, 'Full gym access, billed every 3 months — save vs monthly.'],
      ['Annual + PT', 365, 15000, 'Full gym access for a year, includes personal training sessions.'],
    ];
    for (const [name, duration, price, desc] of plans) {
      const exists = await db.query(
        'SELECT id FROM membership_plans WHERE gym_id = $1 AND name = $2',
        [gymId, name]
      );
      if (exists.rows.length === 0) {
        await db.query(
          `INSERT INTO membership_plans (gym_id, name, duration_days, price, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [gymId, name, duration, price, desc]
        );
      }
    }
    console.log('Starter membership plans ready.');

    // 4. Chatbot FAQs (matches gym by name — see the .sql file's WHERE clause)
    const faqSqlPath = path.join(__dirname, 'seeders', 'chatbot_faqs.seed.sql');
    if (fs.existsSync(faqSqlPath)) {
      await db.query(fs.readFileSync(faqSqlPath, 'utf8'));
      console.log('Chatbot FAQs seeded.');
    }

    console.log('\nSeed complete.');
  } catch (err) {
    console.error('Seed failed.');
    console.error(err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

seed();
