// middlewares/editTokenMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
require('dotenv').config();

const verifyEditToken = async (req, res, next) => {
    try {
      // Handle OPTIONS requests first
      if (req.method === 'OPTIONS') return next();
  
      // Get token ONLY from Authorization header
      const token = req.headers.authorization?.split(' ')[1] || req.query.token;
      if (!token) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_MISSING'
        });
      }

      // Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        console.error('JWT Error:', jwtError.message);
        return res.status(401).json({ error: 'Invalid token_mid', code: 'INVALID_TOKEN_MID' });
      }
  
      // Validate token purpose
      if (decoded.purpose !== 'event-edit') {
        return res.status(401).json({ error: 'Invalid token type', code: 'INVALID_TOKEN_TYPE' });
      }
  
      // Fetch event data
      const event = await prisma.event.findUnique({
        where: { id: decoded.eventId },
        select: { 
          editToken: true,
          tokenExpires: true,
          email: true,
          title: true,
          salt: true 
        }
      });
  
      // Validate event and token match
      if (!event || event.editToken !== token) {
        return res.status(401).json({ error: 'Invalid session' });
      }
  
      // Check expiration
      if (new Date() > new Date(event.tokenExpires)) {
        return res.status(401).json({ error: 'Session expired' });
      }
  
      // Validate hashes (ensure email is lowercase)
      const emailHash = crypto.createHash('sha256').update(event.email.toLowerCase()).digest('hex');
        
      const titleHash = crypto.createHash('sha256').update(event.title).digest('hex');
  
      if (emailHash !== decoded.emailHash || titleHash !== decoded.titleHash) {
        return res.status(401).json({ error: 'Data tampered' });
      }
  
      // Validate salt
      if (event.salt !== decoded.salt) {
        return res.status(401).json({ error: 'Security mismatch' });
      }
  
      // Attach validated data to request
      req.eventId = decoded.eventId;
      req.event = { email: event.email, title: event.title };
      next();
  
    } catch (error) {
        console.error('Edit Token Middleware Error:', error);
        res.status(401).json({ 
          error: 'Authentication failed',
          code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
        });
    }
  };

module.exports = verifyEditToken;