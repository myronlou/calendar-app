const jwt = require('jsonwebtoken');
require('dotenv').config();

const validateRegistrationTokens = (req, res, next) => {
  try {
    const { email } = req.body;
    const session = registrationSessions.get(email.toLowerCase());

    // Check for valid registration session
    if (!session || !session.valid) {
      return res.status(403).json({ error: 'Registration session expired or invalid' });
    }

    // Original token validation
    const { otpVerificationToken, managementToken } = req.body;
    const otpDecoded = jwt.verify(otpVerificationToken, process.env.JWT_SECRET);
    const mgmtDecoded = jwt.verify(managementToken, process.env.JWT_SECRET);

    // Email consistency check
    const emails = [
      email.toLowerCase(),
      otpDecoded.email.toLowerCase(),
      mgmtDecoded.email.toLowerCase()
    ];

    if (new Set(emails).size !== 1) {
      return res.status(400).json({ error: 'Email mismatch detected' });
    }

    // Invalidate session after successful validation
    registrationSessions.delete(email.toLowerCase());
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token format' });
  }
};

module.exports = validateRegistrationTokens;