const db = require('../config/database');
const bcrypt = require('bcrypt');
const generateApiKey = require('../utils/generateApiKey');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

for (const envPath of [path.resolve(__dirname, '..', '.env'), path.resolve(__dirname, '..', '..', '.env')]) {
  dotenv.config({ path: envPath });
}

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_dev_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  const { full_name, email, phone, password, confirm_password } = req.body || {};

  if (!full_name || !email || !password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Password confirmation does not match.' });
  }

  try {
    // Check duplicate email
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const apiKey = generateApiKey();
    const passwordHash = await bcrypt.hash(password, 10);

    // find FREE plan id
    const [planRows] = await db.query('SELECT id FROM plans WHERE name = ? LIMIT 1', ['FREE']);
    const planId = planRows.length ? planRows[0].id : 1;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [userResult] = await conn.query(
        'INSERT INTO users (full_name, email, phone, password_hash, api_key, plan_id) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, phone || null, passwordHash, apiKey, planId]
      );
      const userId = userResult.insertId;

      await conn.query(
        'INSERT INTO api_keys (user_id, api_key, status) VALUES (?, ?, ?)',
        [userId, apiKey, 'active']
      );

      await conn.commit();
      conn.release();

      return res.json({ success: true, message: 'Account created successfully.', apiKey });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error('Registration transaction error', err);
      return res.status(500).json({ success: false, message: 'Registration failed.' });
    }
  } catch (err) {
    console.error('Registration error', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

  try {
    const [rows] = await db.query('SELECT id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const payload = { id: user.id, full_name: user.full_name, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // set httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie('token', token, cookieOptions);

    return res.json({ success: true, message: 'Logged in successfully.' });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

function logout(req, res) {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out.' });
}

async function me(req, res) {
  try {
    // Expect token in cookie
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    const payload = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user info
    const [rows] = await db.query('SELECT id, full_name, email, api_key, plan_id, created_at FROM users WHERE id = ? LIMIT 1', [payload.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const user = rows[0];
    return res.json({ success: true, user: { id: user.id, full_name: user.full_name, email: user.email, api_key: user.api_key, plan_id: user.plan_id, created_at: user.created_at } });
  } catch (err) {
    console.error('Me error', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = { register, login, logout, me };
