const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');

for (const envPath of [path.resolve(__dirname, '.env'), path.resolve(__dirname, '..', '.env')]) {
  dotenv.config({ path: envPath });
}

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ['\'self\'', '\'unsafe-inline\''],
      'style-src': ['\'self\'', '\'unsafe-inline\''],
    },
  },
}));
app.use(express.json());
app.use(cookieParser());

const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const weatherRoutes = require('./routes/weatherRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const errorHandler = require('./middleware/errorHandler');

// Auth routes (API)
app.use('/api/auth', authRoutes);

// Protected route to serve dashboard (ensure cookie-based auth)
app.get('/dashboard.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
});

// Serve frontend static files (public)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Explicitly serve main frontend pages so production (Railway) resolves them
const frontendRoot = path.join(__dirname, '..', 'frontend');
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(frontendRoot, 'index.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'login.html'));
});
app.get('/register.html', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'register.html'));
});
app.get('/invoices.html', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'invoices.html'));
});

// Example protected API route
app.get('/api/protected/profile', authMiddleware, async (req, res) => {
  // req.user set by middleware
  return res.json({ success: true, user: req.user });
});

// Developer & dashboard weather routes
app.use('/api', weatherRoutes);

// Invoice routes
app.use('/api/invoices', invoiceRoutes);

// Usage endpoints
app.get('/api/usage/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // total this month
    const [rows] = await db.query(`SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())`, [userId]);
    const used = rows[0].cnt || 0;
    const [planRows] = await db.query('SELECT p.monthly_request_limit FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = ? LIMIT 1', [userId]);
    const limit = planRows.length ? planRows[0].monthly_request_limit : 100;
    return res.json({ success: true, used, limit });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Failed' }); }
});

app.get('/api/usage/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [planRows] = await db.query('SELECT p.monthly_request_limit FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = ? LIMIT 1', [userId]);
    const limit = planRows.length ? planRows[0].monthly_request_limit : 100;

    const [totalRows] = await db.query('SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ?', [userId]);
    const [monthlyRows] = await db.query('SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())', [userId]);
    const [todayRows] = await db.query('SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND DATE(requested_at)=CURDATE()', [userId]);

    const used = monthlyRows[0].cnt || 0;
    const remaining = Math.max(limit - used, 0);
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

    return res.json({ success: true, total: totalRows[0].cnt || 0, today: todayRows[0].cnt || 0, monthly: used, limit, remaining, percent });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Failed' }); }
});

app.get('/api/usage/recent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT endpoint, request_input, response_status, response_time_ms, requested_at FROM api_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 10', [userId]);
    return res.json({ success: true, recent: rows });
  } catch (err) { console.error(err); return res.status(500).json({ success: false, message: 'Failed' }); }
});

// global error handler
app.use(errorHandler);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'APIForge backend running' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ success: true, result: rows[0].solution });
  } catch (err) {
    console.error('DB test error', err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`APIForge backend listening on ${HOST}:${PORT}`);
  });
}

module.exports = app;
