// middlewares/editTokenMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
require('dotenv').config();

const verifyEditToken = async (req, res, next) => {
  try {
    const token = req.query.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No edit token provided' });
    }

    // Verify JWT structure and signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate token purpose
    if (decoded.purpose !== 'event-edit') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Get full event data
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

    // Validate event existence
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify token matches database
    if (event.editToken !== token) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check expiration
    if (new Date() > new Date(event.tokenExpires)) {
      return res.status(401).json({ 
        error: 'Token expired - request new OTP',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Verify email hash
    const emailHash = crypto.createHash('sha256')
      .update(event.email).digest('hex');
    if (emailHash !== decoded.emailHash) {
      return res.status(401).json({ error: 'Token invalidated by email change' });
    }

    // Verify title hash
    const titleHash = crypto.createHash('sha256')
      .update(event.title).digest('hex');
    if (titleHash !== decoded.titleHash) {
      return res.status(401).json({ error: 'Token invalidated by title change' });
    }

    // Verify salt matches
    if (event.salt !== decoded.salt) {
      return res.status(401).json({ error: 'Invalid session salt' });
    }

    req.eventId = decoded.eventId;
    next();
  } catch (error) {
    console.error('Edit Token Middleware Error:', error);
    return res.status(401).json({ 
      error: 'Invalid edit token',
      details: error.message
    });
  }
};

module.exports = verifyEditToken;