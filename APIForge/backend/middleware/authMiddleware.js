const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_dev_secret_change_me';

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // contains id, full_name, email
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
