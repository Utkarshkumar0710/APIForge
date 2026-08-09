const db = require('../config/database');

async function validateApiKey(key) {
  if (!key) return null;
  const [rows] = await db.query('SELECT k.*, u.full_name FROM api_keys k JOIN users u ON k.user_id = u.id WHERE k.api_key = ? AND k.status = ? LIMIT 1', [key, 'active']);
  if (!rows.length) return null;
  return rows[0];
}

module.exports = { validateApiKey };
