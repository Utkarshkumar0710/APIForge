const weatherService = require('../services/weatherService');
const apiKeyService = require('../services/apiKeyService');
const db = require('../config/database');

async function developerWeather(req, res) {
  try {
    const apiKey = req.header('X-API-Key');
    const city = req.query.city;
    if (!apiKey) return res.status(401).json({ success: false, message: 'X-API-Key header required.' });
    if (!city) return res.status(400).json({ success: false, message: 'City is required.' });

    const key = await apiKeyService.validateApiKey(apiKey);
    if (!key) return res.status(401).json({ success: false, message: 'Invalid API key.' });

    const userId = key.user_id;
    // Check monthly usage and plan limit
    const [planRows] = await db.query(
      'SELECT p.monthly_request_limit FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = ? LIMIT 1',
      [userId]
    );
    const limit = planRows.length ? planRows[0].monthly_request_limit : 100;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND response_status >= 200 AND response_status < 300 AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())`,
      [userId]
    );
    const used = countRows[0].cnt || 0;
    if (used >= limit) return res.status(429).json({ success: false, message: 'Monthly API limit reached.' });

      const start = Date.now();
      let weather;
    try {
      weather = await weatherService.getCurrentWeather(city);
    } catch (e) {
      if (e.message && e.message.includes('OpenWeather API key')) {
        return res.status(500).json({ success: false, message: 'OpenWeather API key not configured on server.' });
      }
      if (e.message && e.message.startsWith('OpenWeather API error:')) {
        return res.status(502).json({ success: false, message: e.message });
      }
      throw e;
    }
    const duration = Date.now() - start;

    // Save request as successful
    await db.query(
      'INSERT INTO api_requests (user_id, api_key, endpoint, request_input, response_status, response_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, apiKey, '/v1/weather', JSON.stringify({ city }), 200, duration]
    );

    return res.json({ success: true, user: key.full_name, city: weather.city, temperature: weather.temperature, humidity: weather.humidity, condition: weather.condition, windSpeed: weather.windSpeed, raw: weather.raw });
  } catch (err) {
    console.error('developerWeather error', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

async function dashboardWeather(req, res) {
  try {
    const city = req.body.city;
    if (!city) return res.status(400).json({ success: false, message: 'City is required.' });

    // req.user from authMiddleware
    const userId = req.user.id;
    // fetch user's api_key
    const [rows] = await db.query('SELECT api_key FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const apiKey = rows[0].api_key;

    // reuse developerWeather logic by validating key
    const key = await apiKeyService.validateApiKey(apiKey);
    if (!key) return res.status(401).json({ success: false, message: 'Invalid API key.' });

    // Check monthly limit
    const [planRows] = await db.query(
      'SELECT p.monthly_request_limit FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = ? LIMIT 1',
      [userId]
    );
    const limit = planRows.length ? planRows[0].monthly_request_limit : 100;
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND response_status >= 200 AND response_status < 300 AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())`,
      [userId]
    );
    const used = countRows[0].cnt || 0;
    if (used >= limit) return res.status(429).json({ success: false, message: 'Monthly API limit reached.' });

    const start = Date.now();
    let weather;
    try {
      weather = await weatherService.getCurrentWeather(city);
    } catch (e) {
      if (e.message && e.message.includes('OpenWeather API key')) {
        return res.status(500).json({ success: false, message: 'OpenWeather API key not configured on server.' });
      }
      throw e;
    }
    const duration = Date.now() - start;

    // Save request
    await db.query(
      'INSERT INTO api_requests (user_id, api_key, endpoint, request_input, response_status, response_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, apiKey, '/dashboard/weather', JSON.stringify({ city }), 200, duration]
    );

    return res.json({ success: true, city: weather.city, temperature: weather.temperature, humidity: weather.humidity, condition: weather.condition, windSpeed: weather.windSpeed, raw: weather.raw });
  } catch (err) {
    console.error('dashboardWeather error', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

async function publicDemo(req, res) {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ success: false, message: 'City is required.' });
    const weather = await weatherService.getCurrentWeather(city);
    return res.json({ success: true, demo: true, city: weather.city, temperature: weather.temperature, humidity: weather.humidity, condition: weather.condition, windSpeed: weather.windSpeed });
  } catch (err) {
    console.error('publicDemo error', err);
    return res.status(500).json({ success: false, message: 'Demo failed.' });
  }
}

module.exports = { developerWeather, dashboardWeather, publicDemo };
