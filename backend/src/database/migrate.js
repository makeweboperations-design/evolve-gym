// Minimal migration runner: applies schema.sql directly.
// As the project grows, replace this with a proper migration tool
// (node-pg-migrate or Knex migrations) so changes are incremental and reversible.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await db.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Migration failed.');
    console.error('Full error:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

migrate();
