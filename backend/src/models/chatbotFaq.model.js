const db = require('../config/db');

async function listByGym(gymId) {
  const { rows } = await db.query(
    `SELECT * FROM chatbot_faqs WHERE gym_id = $1 ORDER BY category, question`,
    [gymId]
  );
  return rows;
}

async function create({ gymId, question, answer, category }) {
  const { rows } = await db.query(
    `INSERT INTO chatbot_faqs (gym_id, question, answer, category)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [gymId, question, answer, category || null]
  );
  return rows[0];
}

async function update(id, gymId, { question, answer, category }) {
  const { rows } = await db.query(
    `UPDATE chatbot_faqs
     SET question = COALESCE($3, question),
         answer = COALESCE($4, answer),
         category = COALESCE($5, category)
     WHERE id = $1 AND gym_id = $2
     RETURNING *`,
    [id, gymId, question, answer, category]
  );
  return rows[0] || null;
}

async function remove(id, gymId) {
  await db.query(`DELETE FROM chatbot_faqs WHERE id = $1 AND gym_id = $2`, [id, gymId]);
}

// Simple keyword match: rank FAQs by how many query words appear in the
// question (weighted higher) or answer. No ML, no external calls — fully
// predictable, which is exactly what's wanted for a first-line FAQ bot.
//
// Two things matter for accuracy here, beyond just counting overlaps:
//   1. Filler/stop words ("how", "do", "have", "each", ...) are stripped
//      before matching — otherwise a query like "How many trainers do we
//      have each day?" can outscore on "have"/"each"/"day" alone and match
//      a completely unrelated FAQ (e.g. cancellation policy) that happens
//      to contain those same common words.
//   2. A minimum confidence bar is enforced. If nothing clears it, this
//      returns no matches at all — the bot should say "I don't know,
//      contact support" rather than confidently hand back the closest
//      weak/coincidental match when there's no real answer for the
//      question asked.
const STOPWORDS = new Set([
  'how', 'what', 'when', 'where', 'why', 'who', 'which', 'does', 'do', 'did', 'is', 'are', 'was', 'were',
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'you', 'your', 'yours', 'we', 'our',
  'ours', 'my', 'mine', 'me', 'it', 'its', 'this', 'that', 'these', 'those', 'can', 'could', 'will', 'would',
  'shall', 'should', 'have', 'has', 'had', 'with', 'from', 'about', 'each', 'many', 'much', 'any', 'all',
  'some', 'if', 'so', 'but', 'not', 'no', 'yes', 'get', 'got', 'need', 'needs', 'want', 'wants', 'like',
  'just', 'please', 'tell', 'know', 'there', 'here', 'than', 'then', 'also', 'still', 'into', 'onto', 'out',
  'up', 'down', 'over', 'under', 'again', 'more', 'most', 'other', 'such', 'only', 'own', 'same', 'too',
  'very', 'be', 'been', 'being', 'am',
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function search(gymId, query) {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  if (words.length === 0) return [];

  const faqs = await listByGym(gymId);

  const scored = faqs.map((faq) => {
    const q = faq.question.toLowerCase();
    const a = faq.answer.toLowerCase();
    let score = 0;
    let questionHits = 0;
    for (const w of words) {
      const re = new RegExp(`\\b${escapeRegex(w)}`);
      if (re.test(q)) {
        score += 2;
        questionHits += 1;
      }
      if (re.test(a)) score += 1;
    }
    return { faq, score, questionHits };
  });

  // At least one real keyword has to appear in the FAQ's own question
  // (not just somewhere in its answer text), and then either a strong
  // single-signal score, or at least two distinct overlapping keywords —
  // a single generic word overlapping isn't enough to call it a match.
  return scored
    .filter((s) => s.questionHits > 0 && (s.score >= 4 || (s.questionHits >= 2 && s.score >= 3)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.faq);
}

module.exports = { listByGym, create, update, remove, search };
