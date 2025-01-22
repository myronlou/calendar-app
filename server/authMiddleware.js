// server/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization; 
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // 'Bearer <token>'
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Store info in req.user for next steps
    req.user = decoded; // e.g. { userId, role, verified }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };

