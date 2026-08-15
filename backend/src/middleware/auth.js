const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * Verifies the JWT sent in the Authorization: Bearer <token> header,
 * loads the current user record (so status changes take effect immediately),
 * and attaches it to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const { rows } = await db.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [
      payload.id,
    ]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    const user = rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact the superadmin.`,
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles, e.g. authorize('superadmin')
 * or authorize('superadmin', 'admin').
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
