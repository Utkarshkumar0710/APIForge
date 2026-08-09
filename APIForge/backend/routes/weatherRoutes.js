const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const authMiddleware = require('../middleware/authMiddleware');

// Developer API endpoint (validate X-API-Key)
router.get('/v1/weather', weatherController.developerWeather);

// Dashboard-protected endpoint (uses cookie auth)
router.post('/dashboard/weather', authMiddleware, weatherController.dashboardWeather);

// Public demo (no API key) - rate limited externally if needed
router.get('/demo', weatherController.publicDemo);

module.exports = router;
