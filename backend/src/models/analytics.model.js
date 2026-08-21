const db = require('../config/db');

async function logView({ path, referrer, sessionId, userAgent }) {
  await db.query(
    `INSERT INTO page_views (path, referrer, session_id, user_agent) VALUES ($1, $2, $3, $4)`,
    [path, referrer || null, sessionId || null, userAgent || null]
  );
}

// Total views + unique sessions in the last N days.
async function getTotals(days) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total_views, COUNT(DISTINCT session_id)::int AS unique_sessions
     FROM page_views
     WHERE created_at >= NOW() - ($1 || ' days')::interval`,
    [days]
  );
  return rows[0];
}

// Views per day for the last N days — feeds the traffic-over-time line chart.
async function getDailyCounts(days) {
  const { rows } = await db.query(
    `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS views
     FROM page_views
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
    [days]
  );
  return rows;
}

// Most-visited pages in the last N days — feeds a simple bar/pie breakdown.
async function getTopPages(days, limit = 10) {
  const { rows } = await db.query(
    `SELECT path, COUNT(*)::int AS views
     FROM page_views
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY path
     ORDER BY views DESC
     LIMIT $2`,
    [days, limit]
  );
  return rows;
}

// Where visitors are coming from — feeds a referrer pie chart.
async function getTopReferrers(days, limit = 10) {
  const { rows } = await db.query(
    `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*)::int AS views
     FROM page_views
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY referrer
     ORDER BY views DESC
     LIMIT $2`,
    [days, limit]
  );
  return rows;
}

module.exports = { logView, getTotals, getDailyCounts, getTopPages, getTopReferrers };
