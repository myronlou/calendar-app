// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');
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
    const { title, start, end } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
      },
    });

    // Optionally send an update email
    await sendBookingUpdate(updatedEvent.email, updatedEvent.title);

    res.json({ message: 'Event updated by admin.' });
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
// Public: No auth middleware
app.post('/api/events/request', async (req, res) => {
  try {
    const { fullName, email, phone, title, start, end } = req.body;

    // Basic validations
    if (!fullName || !email || !phone || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const phoneRegex = /^\+\d{1,3} [0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create event as not verified
    const newEvent = await prisma.event.create({
      data: {
        fullName,
        email,
        phone,
        title,
        start: new Date(start),
        end: new Date(end),
        isVerified: false,
        verificationCode: otp,
      },
    });

    // Send OTP email
    await sendVerificationEmail(email, otp);

    res.json({
      eventId: newEvent.id,
      message: 'Event request created. OTP sent to email.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/events/verify', async (req, res) => {
  try {
    const { eventId, otp } = req.body;
    if (!eventId || !otp) {
      return res.status(400).json({ error: 'Missing eventId or otp' });
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.isVerified) {
      return res.status(400).json({ error: 'Event already verified' });
    }

    if (event.verificationCode !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark event as verified
    await prisma.event.update({
      where: { id: event.id },
      data: { isVerified: true, verificationCode: null },
    });

    // Send booking confirmation
    await sendBookingConfirmation(event.email, event.title);

    //send admin email
    await sendAdminNotification(process.env.ADMIN_EMAIL, title, email);

    res.json({ message: 'Event verified and confirmed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1) Request OTP for editing/canceling
app.post('/api/events/requestEditOrCancel', async (req, res) => {
  try {
    const { eventId, email } = req.body;

    const event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Make sure the email matches the event's owner
    if (event.email !== email) {
      return res.status(403).json({ error: 'Email does not match event owner' });
    }

    // Generate a fresh OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store it back in the event (same field or a new "editCode" field)
    await prisma.event.update({
      where: { id: event.id },
      data: { verificationCode: otp },
    });

    // Send this new OTP
    await sendVerificationEmail(email, otp);

    res.json({ message: 'OTP for edit/cancel sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2) Confirm edit/cancel with the OTP
app.post('/api/events/confirmEditOrCancel', async (req, res) => {
  try {
    const { eventId, otp, newTitle, newStart, newEnd, cancel } = req.body;

    const event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check OTP
    if (event.verificationCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (cancel) {
      // Cancel (delete) event
      await prisma.event.delete({ where: { id: event.id } });
      return res.json({ message: 'Event cancelled.' });
    }

    // Otherwise, do an update
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        title: newTitle,
        start: new Date(newStart),
        end: new Date(newEnd),
        // Clear OTP on success
        verificationCode: null,
      },
    });

    res.json({ message: 'Event updated.', updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
