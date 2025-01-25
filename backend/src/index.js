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

app.use(cors());
app.use(express.json());

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

        const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1) GET all events (admin)
app.get('/api/admin/events', authMiddleware, async (req, res) => {
  try {
      const allEvents = await prisma.event.findMany({
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
              updatedAt: true,
              // Explicitly exclude sensitive fields
              verificationCode: false,
              editToken: false,
              tokenExpires: false
          }
      });
      res.json(allEvents);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
});

// 2) Create new event (admin) without OTP
app.post('/api/admin/events', authMiddleware, async (req, res) => {
  try {
    const { fullName, email, phone, title, start, end } = req.body;

    // Validate fields, phone, email, etc. if desired
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate Phone Number (Basic)
    const phoneRegex = /^\+\d{1,3} [0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Admin-created => skip OTP, mark isVerified: true
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

    // Immediately send booking confirmation
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

    // Optionally send an update email
    await sendBookingUpdate(updatedEvent.email, updatedEvent.title);

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4) Delete event (admin)
app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const eventToDelete = await prisma.event.findUnique({ where: { id } });
    if (!eventToDelete) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.event.delete({ where: { id } });

    await sendBookingCancellation(eventToDelete.email, eventToDelete.title);

    res.json({ message: 'Event deleted' });
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

    // [MODIFIED] Enhanced validation
    if (![fullName, email, phone, title, start, end].every(field => field?.trim())) {
      return res.status(400).json({ error: 'All fields are required' });
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

    if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // [MODIFIED] Secure OTP generation
    const otp = crypto.randomInt(100000, 999999).toString();
    const eventStart = new Date(start);
    const eventEnd = new Date(end);

    // [MODIFIED] Date validation
    if (eventStart < new Date()) {
      return res.status(400).json({ error: 'Event must be in the future' });
    }
    if ((eventEnd - eventStart) < 30*60000) {
      return res.status(400).json({ error: 'Minimum 30 minute duration' });
    }

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
    
    // [MODIFIED] Input validation
    if (!eventId || !otp) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: { 
        id: true, 
        email: true, 
        verificationCode: true, 
        isVerified: true, 
        start: true, 
        title: true, 
        end: true 
      }
    });

    if (!event) return res.status(404).json({ error: 'Resource not found' });
    if (event.isVerified) return res.status(400).json({ error: 'Already verified' });
    if (event.verificationCode !== otp) return res.status(400).json({ error: 'Invalid code' });

    //const eventStart = new Date(event.start).getTime();
    //const maxExpiry = eventStart - Date.now() - 86400000;
    //const expiresInMs = Math.max(3600000, maxExpiry);
    const expiresInMs = 3600000; // 1 hour in milliseconds
    const expiresInSeconds = 3600;

    // [MODIFIED] JWT expiration in seconds
    const editToken = jwt.sign(
      {
        purpose: 'event-edit',  // [ADDED] Token purpose claim
        eventId: event.id,
        emailHash: crypto.createHash('sha256').update(event.email).digest('hex'),
        titleHash: crypto.createHash('sha256').update(event.title).digest('hex'),
        salt: crypto.randomBytes(16).toString('hex')
      },
      process.env.JWT_SECRET,
      { expiresIn: expiresInSeconds }  // Convert to seconds
    );

    await prisma.event.update({
      where: { id: event.id },
      data: {
        isVerified: true,
        verificationCode: null,
        editToken,
        tokenExpires: new Date(Date.now() + expiresInMs)
      }
    });

    await sendBookingConfirmation(event.email, event.title, editToken);
    await sendAdminNotification(process.env.ADMIN_EMAIL, event.title, event.email);

    res.json({ 
      message: 'Verification successful',
      token: editToken,
      expiresIn: expiresInMs,
      eventId: event.id
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    await prisma.event.update({
      where: { id: req.eventId },
      data: { editToken: null }
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

// Validate token middleware (used by frontend)
app.get('/api/events/validate-token', verifyEditToken, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.eventId },
      select: { 
        id: true, 
        title: true, 
        start: true, 
        end: true,
        tokenExpires: true 
      }
    });
    
    res.json({ 
      valid: true, 
      event,
      expiresAt: event.tokenExpires  // [ADDED] Client-side expiration
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid session' });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
