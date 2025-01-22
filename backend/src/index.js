// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middlewares/authMiddleware'); // Updated middleware import
const { sendVerificationEmail, sendBookingConfirmation, sendBookingUpdate } = require('./services/emailService'); // Updated services

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

        const token = jwt.sign({ userId: admin.id, isAdmin: admin.role === 'admin' }, process.env.JWT_SECRET, {
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

        await sendBookingConfirmation(event.email, event.title);

        res.json({ message: 'Event verified and confirmed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// -------------------- ADMIN-ONLY CALENDAR ROUTES --------------------
// Admin can view all events (Auth required)
app.get('/api/events', authMiddleware, async (req, res) => {
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

// Admin can update an event and notify customers
app.put('/api/events/update/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, start, end } = req.body;
        const updatedEvent = await prisma.event.update({
            where: { id },
            data: { title, start: new Date(start), end: new Date(end) }
        });

        await sendBookingUpdate(updatedEvent.email, updatedEvent.title);
        res.json({ message: 'Event updated and notification sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin can delete events (Auth required)
app.delete('/api/events/:id', authMiddleware, async (req, res) => {
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
