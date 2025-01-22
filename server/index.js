require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('./authMiddleware'); // Importing middleware
const { sendVerificationEmail, sendEventConfirmationEmail } = require('./emailService');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// -------------------- ADMIN LOGIN --------------------
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

// -------------------- CUSTOMER EVENT FLOWS --------------------

// 1) Customers can request an event (No auth needed)
app.post('/api/events/request', async (req, res) => {
  try {
    const { fullName, email, phone, title, start, end } = req.body;
    if (!fullName || !email || !phone || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newEvent = await prisma.event.create({
      data: {
        fullName,
        email,
        phone,
        title,
        start: new Date(start),
        end: new Date(end),
        isVerified: false,
        verificationCode: otp
      }
    });

    await sendVerificationEmail(email, otp);

    res.json({ eventId: newEvent.id, message: 'Event request created. OTP sent to email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2) Customers verify the event using OTP (No auth needed)
app.post('/api/events/verify', async (req, res) => {
  try {
    const { eventId, otp } = req.body;
    if (!eventId || !otp) {
      return res.status(400).json({ error: 'Missing eventId or otp' });
    }

    const event = await prisma.event.findUnique({ where: { id: parseInt(eventId) } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.isVerified) {
      return res.status(400).json({ error: 'Event already verified' });
    }

    if (event.verificationCode !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { isVerified: true, verificationCode: null }
    });

    await sendEventConfirmationEmail(event.email, event.title);

    res.json({ message: 'Event verified and confirmed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- ADMIN-ONLY CALENDAR ROUTES --------------------

// Admin can view all events (Auth required)
app.get('/api/events', authenticate, async (req, res) => {
  try {
    const allEvents = await prisma.event.findMany({
      orderBy: { start: 'asc' }
    });
    res.json(allEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin can delete events (Auth required)
app.delete('/api/events/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.event.delete({ where: { id } });
    res.json({ message: 'Event deleted' });
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

