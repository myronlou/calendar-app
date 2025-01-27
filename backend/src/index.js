// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');
const verifyEditToken = require('./editTokenMiddleware');
const crypto = require('crypto');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const { sendVerificationEmail, sendBookingConfirmation, sendBookingUpdate, sendBookingCancellation, sendEventReminder, sendAdminNotification} = require('./emailService');

const app = express();
const prisma = new PrismaClient();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(hpp());


// Ensure only one admin exists at startup
async function initializeAdmin() {
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await prisma.user.create({
            data: {
                email: process.env.ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
            }
        });
        console.log('Admin user created');
    }
}
initializeAdmin().catch(console.error);

// -------------------- ADMIN-ONLY CALENDAR ROUTES --------------------
// -------------------- ADMIN ENDPOINTS --------------------
const deleteUnverifiedEvents = async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await prisma.event.deleteMany({
      where: {
        isVerified: false,
        createdAt: { lt: tenMinutesAgo }
      }
    });
    console.log(`Cleaned up ${result.count} unverified events`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Run cleanup every minute
setInterval(deleteUnverifiedEvents, 60 * 1000);

// Admin login
app.post('/auth/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await prisma.user.findUnique({ where: { email } });
        if (!admin || admin.role !== 'admin') {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ 
            userId: admin.id, 
            role: admin.role 
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1) GET only verified events
app.get('/api/admin/events', authMiddleware, async (req, res) => {
  try {
      const verifiedEvents = await prisma.event.findMany({
          where: { 
              isVerified: true,
              deletedAt: null
          },
          orderBy: { start: 'asc' },
          select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              title: true,
              start: true,
              end: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true
          }
      });
      res.json(verifiedEvents);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
});

// 2) Create new event (admin)
app.post('/api/admin/events', authMiddleware, async (req, res) => {
  try {
    const { fullName, email, phone, title, start, end } = req.body;

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const phoneRegex = /^\+\d{1,3} [0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Admin-created event
    const newEvent = await prisma.event.create({
      data: {
        fullName,
        email,
        phone,
        title,
        start: new Date(start),
        end: new Date(end),
        isVerified: true,
        verificationCode: null,
      },
    });

    await sendBookingConfirmation(email, title);
    res.json({
      eventId: newEvent.id,
      message: 'Event created and confirmed by admin.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3) Update event (admin)
app.put('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, start, end, fullName, email, phone } = req.body;

    // Basic validation
    if (!title || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
        fullName,
        email,
        phone
      },
    });

    await sendBookingUpdate(updatedEvent.email, updatedEvent.title);
    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4) Delete event (admin - soft delete)
app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Soft delete
    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await sendBookingCancellation(event.email, event.title);
    res.json({ message: 'Event archived successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- CUSTOMER EVENT FLOWS --------------------
// Request event creation with OTP
app.post('/api/events/request', async (req, res) => {
  try {
    const { fullName, email, phone, title, start, end } = req.body;

    const eventStart = new Date(start);
    const eventEnd = new Date(end);

    // [MODIFIED] Enhanced validation
    if (![fullName, email, phone, title, start, end].every(field => field?.trim())) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (eventStart < new Date()) {
      return res.status(400).json({ error: 'Event must be in the future' });
    }
    if ((eventEnd - eventStart) < 30*60000) {
      return res.status(400).json({ error: 'Minimum 30 minute duration' });
    }

    // [MODIFIED] Sanitization
    const sanitize = (str) => str.replace(/<[^>]*>?/gm, '');
    const cleanTitle = sanitize(title);
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // [MODIFIED] E.164 phone format validation
    if (!/^\+\d{1,3} [0-9]{7,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }
    // [MODIFIED] Secure OTP generation
    const otp = crypto.randomInt(100000, 999999).toString();

    const event = await prisma.event.create({
      data: {
        fullName: sanitize(fullName),
        email: email.toLowerCase().trim(),
        phone,
        title: cleanTitle,
        start: eventStart,
        end: eventEnd,
        verificationCode: otp,
        isVerified: false
      }
    });

    await sendVerificationEmail(email, otp);
    res.json({ eventId: event.id, message: 'Verification code sent' });

  } catch (error) {
    console.error('Event request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP and create edit token
app.post('/api/events/verify', async (req, res) => {
  try {
    const { eventId, otp } = req.body;
    
    // Input validation
    if (!eventId || !otp) return res.status(400).json({ error: 'Invalid request' });

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: { 
        id: true, email: true, verificationCode: true, 
        isVerified: true, title: true, start: true 
      }
    });

    // Validate event and OTP
    if (!event || event.isVerified || event.verificationCode !== otp) {
      return res.status(401).json({ error: 'Invalid verification' });
    }

    // Generate secure edit token
    const salt = crypto.randomBytes(16).toString('hex');
    const expiresInMs = 3600000; // 1 hour

    const editToken = jwt.sign(
      {
        purpose: 'event-edit',
        eventId: event.id,
        emailHash: crypto.createHash('sha256').update(event.email.toLowerCase()).digest('hex'), // Lowercase consistency
        titleHash: crypto.createHash('sha256').update(event.title).digest('hex'),
        salt // Include salt in JWT
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update database with token details
    await prisma.event.update({
      where: { id: event.id },
      data: {
        isVerified: true,
        verificationCode: null,
        editToken, // Correct field name
        tokenExpires: new Date(Date.now() + expiresInMs),
        salt // Store salt
      }
    });

    // Send confirmation (ensure email uses lowercase)
    await sendBookingConfirmation(event.email.toLowerCase(), event.title, editToken);
    
    res.json({ 
      message: 'Verified successfully',
      token: editToken // Return token explicitly
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all events for a user
app.get('/api/events/user-events', verifyEditToken, async (req, res) => {
  try {
    // Get user email from the validated token
    const event = await prisma.event.findUnique({
      where: { id: req.eventId },
      select: { email: true }
    });

    if (!event) {
      return res.status(404).json([]);
    }

    // Find all events for this email
    const userEvents = await prisma.event.findMany({
      where: {
        email: event.email,
        deletedAt: null,
        tokenExpires: { gt: new Date() }
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
        isVerified: true
      },
      orderBy: { start: 'asc' }
    });

    res.json(userEvents);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit event (token required)
app.put('/api/events/:id', verifyEditToken, async (req, res) => {
  try {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    
    // [MODIFIED] Enhanced time validation
    if (start >= end) {
      return res.status(400).json({ error: 'Invalid time range' });
    }
    if (start < new Date()) {
      return res.status(400).json({ error: 'Cannot reschedule to past' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: req.eventId },
      data: { 
        title: sanitize(req.body.title),  // [ADDED] Sanitization
        start, 
        end 
      }
    });

    await sendBookingUpdate(updatedEvent.email, updatedEvent.title);
    res.json(updatedEvent);

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event (token required)
app.delete('/api/events/:id', verifyEditToken, async (req, res) => {
  try {
    // [MODIFIED] Soft delete implementation
    const event = await prisma.event.update({
      where: { id: req.eventId },
      data: { 
        deletedAt: new Date(),  // [ADDED] Archival
        editToken: null 
      }
    });

    await sendBookingCancellation(event.email, event.title);
    res.json({ message: 'Event cancelled' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request new OTP for expired token
app.post('/api/events/renew-access', async (req, res) => {
  try {
    const { eventId, email } = req.body;
    
    // [MODIFIED] Input validation
    if (!eventId || !email) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: { email: true, isVerified: true }
    });

    // [MODIFIED] Generic error response
    if (!event || event.email !== email.toLowerCase().trim()) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // [ADDED] Prevent renewal for verified events
    if (event.isVerified) {
      return res.status(400).json({ error: 'Already verified' });
    }

    // [MODIFIED] Secure OTP generation
    const otp = crypto.randomInt(100000, 999999).toString();
    await prisma.event.update({
      where: { id: parseInt(eventId) },
      data: { verificationCode: otp }
    });

    await sendVerificationEmail(email, otp);
    res.json({ message: 'New verification code sent' });

  } catch (error) {
    console.error('Renewal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to your customer backend routes
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
        isVerified: true,
        tokenExpires: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate token middleware (used by frontend)
app.options('/api/events/validate-token', cors(corsOptions)); // Preflight handler
// Update your existing validate-token endpoint
app.get('/api/events/validate-token', verifyEditToken, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.eventId },
      select: { 
        id: true, 
        tokenExpires: true,
        email: true,
      }
    });
    
    if (!event || new Date() > new Date(event.tokenExpires)) {
      return res.status(401).json({ valid: false });
    }

    res.json({ 
      valid: true, 
      event: {
        id: event.id,
        email: event.email
      },
      expiresAt: event.tokenExpires
    });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

app.get('/api/events/user', verifyEditToken, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        email: req.event.email,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
        isVerified: true
      }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
