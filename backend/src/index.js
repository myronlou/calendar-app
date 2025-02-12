require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Prisma, PrismaClient } = require('@prisma/client');
const authMiddleware = require('./authMiddleware');
const validateRegistrationTokens = require('./validateRegiistrationTokens');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const hpp = require('hpp');
const { sendOtpEmail, sendBookingConfirmation, sendBookingUpdate, sendBookingCancellation } = require('./emailService');

const app = express();
const prisma = new PrismaClient();
// Security Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(hpp());

const adminMiddleware = async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Database Initialization
async function initializeAdmin() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        verified: true
      }
    });
  }
}
initializeAdmin().catch(console.error);

// Add at the top with other requires
const registrationSessions = new Map();

// Add session cleanup interval (place after Prisma client initialization)
setInterval(() => {
  const now = Date.now();
  registrationSessions.forEach((session, email) => {
    if (now - session.createdAt > 15 * 60 * 1000) { // 15-minute expiry
      registrationSessions.delete(email);
    }
  });
}, 5 * 60 * 1000); // Clean every 5 minutes

// -------------------- AUTHENTICATION ROUTES --------------------
app.post('/api/otp/generate', async (req, res) => {
  const { email, type } = req.body;
  
  if (!['auth', 'booking'].includes(type)) {
    return res.status(400).json({ error: 'Invalid OTP type' });
  }

  if (type === 'auth') {
    registrationSessions.set(email.toLowerCase(), {
      createdAt: Date.now(),
      valid: true
    });
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10*60*1000); // 10 minutes for all OTPs

  try {
    await prisma.oTP.upsert({
      where: { email_type: { email, type } },
      update: { code, expiresAt, used: false },
      create: { email, type, code, expiresAt }
    });

    await sendOtpEmail(email, code, type);
    res.json({ success: true });
  } catch (error) {
    registrationSessions.delete(email.toLowerCase());
    res.status(500).json({ error: 'OTP generation failed' });
  }
});

const verifyOtp = async (email, code, type) => {
  const otpRecord = await prisma.oTP.findUnique({
    where: { email_type: { email, type } }
  });

  if (!otpRecord || otpRecord.code !== code || otpRecord.expiresAt < new Date() || otpRecord.used) {
    return false;
  }

  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { used: true }
  });

  return true;
};

app.post('/api/otp/verify', async (req, res) => {
  try {
    const { email, code, type } = req.body;
    
    // Validate request parameters
    if (!email || !code || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use the existing verifyOtp function
    const isValid = await verifyOtp(email, code, type);
    
    if (isValid) {
      const token = jwt.sign(
        { 
          email: email.toLowerCase(), // Standardize email case
          type,
          verified: true 
        },
        process.env.JWT_SECRET,
        { expiresIn: '5m' } // Short-lived verification token
      );
      res.json({ success: true, token });
    } else {
      res.status(400).json({ error: 'Invalid or expired OTP' });
    }
  } catch (error) {
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// Updated Registration Endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, otpVerificationToken, managementToken } = req.body;

    // Verify and decode both tokens
    const managementDecoded = jwt.verify(managementToken, process.env.JWT_SECRET);
    const otpDecoded = jwt.verify(otpVerificationToken, process.env.JWT_SECRET);

    // Validate token consistency
    const tokenEmail = managementDecoded.email.toLowerCase();
    const otpEmail = otpDecoded.email.toLowerCase();
    const requestEmail = email.toLowerCase();

    if (tokenEmail !== otpEmail || tokenEmail !== requestEmail) {
      return res.status(400).json({ error: 'Email mismatch detected' });
    }

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ 
      where: { email: tokenEmail } 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: tokenEmail,
        password: await bcrypt.hash(password, 10),
        role: 'customer',
        verified: true
      }
    });

    // Link existing events
    await prisma.event.updateMany({
      where: { email: tokenEmail },
      data: { userId: user.id }
    });

    // Generate auth token
    const expiresIn = user.role === 'admin' ? '24h' : '7d';
    const authToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({ token: authToken, role: user.role });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error.name === 'JsonWebTokenError' 
      ? 'Invalid verification token' 
      : 'Registration failed';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, otp, verificationToken } = req.body;

    // If using pre-verified token (from OTP verification)
    if (verificationToken) {
      const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { email: decoded.email }
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      const expiresIn = user.role === 'admin' ? '24h' : '7d';
      const authToken = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn }
      );

      return res.json({ token: authToken, role: user.role });
    }

    // Regular OTP login flow
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify OTP
    const isValid = await verifyOtp(email, otp, 'auth');
    if (!isValid) return res.status(400).json({ error: 'Invalid OTP' });

    // Update last verification time for non-admin users
    if (user.role !== 'admin') {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastOtpVerifiedAt: new Date() }
      });
    }

    const expiresIn = user.role === 'admin' ? '24h' : '7d';
    const authToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({ token: authToken, role: user.role });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Add check-email endpoint
app.get('/api/events/check-email', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token missing' });

    // Verify token and decode claims
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email, eventId } = decoded;

    // Validate booking exists and is unclaimed
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { userId: true }
    });

    if (!event) return res.status(404).json({ error: 'Booking not found' });
    if (event.userId) return res.status(409).json({ error: 'Booking already claimed' });

    // Check user existence
    const user = await prisma.user.findUnique({ where: { email } });
    res.json({ 
      hasAccount: !!user,
      email: email.toLowerCase()
    });

  } catch (error) {
    console.error('Check-email error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Add validate-token endpoint
app.get('/api/events/validate-token', authMiddleware, (req, res) => {
  // Return user role in response
  res.status(200).json({ 
    valid: true,
    role: req.user.role 
  });
});

// -------------------- EVENT ROUTES --------------------
// Create Event (Authenticated + Guest)
app.post('/api/events', async (req, res) => {
  try {
    const { eventData, token } = req.body;

    // Validate request structure
    if (!token || !eventData) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired verification token' });
    }

    let emailToUse;
    if (decoded.userId) {
      // Authenticated user flow
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'Authenticated user not found' });
      }
      emailToUse = user.email.toLowerCase();
    } else {
      // OTP token flow
      if (!decoded.verified || decoded.type !== 'booking' || !decoded.email) {
        return res.status(401).json({ error: 'Invalid token claims' });
      }
      if (eventData.email.toLowerCase() !== decoded.email.toLowerCase()) {
        return res.status(401).json({ error: 'Email mismatch' });
      }
      emailToUse = eventData.email.toLowerCase();
    }

    // Validate required fields
    const requiredFields = ['start', 'fullName', 'phone', 'bookingTypeId'];
    if (!decoded.userId) {
      requiredFields.push('email');
    }
    
    const missingFields = requiredFields.filter(field => !eventData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(eventData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone format (e.g., +852 12345678)
    const phoneRegex = /^\+\d{1,3} \d{8,15}$/;
    if (!phoneRegex.test(eventData.phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const startDate = new Date(eventData.start);

    // Use bookingTypeId to determine event title and duration
    const bookingType = await prisma.bookingType.findUnique({
      where: { id: parseInt(eventData.bookingTypeId) }
    });
    if (!bookingType) {
      return res.status(400).json({ error: 'Invalid booking type' });
    }
    // Compute the event's end time based on the booking type's duration.
    const endDate = new Date(startDate.getTime() + bookingType.duration * 60 * 1000);

    // Check if a user with emailToUse exists (for linking purposes)
    const existingUser = await prisma.user.findUnique({
      where: { email: emailToUse }
    });

    // Create event in database
    const event = await prisma.event.create({
      data: {
        bookingTypeId: bookingType.id,
        start: startDate,
        end: endDate,
        fullName: eventData.fullName,
        email: emailToUse,
        phone: eventData.phone,
        user: existingUser ? { connect: { id: existingUser.id } } : undefined
      }
    });

    const now = Date.now();
    const eventStartTime = new Date(event.start).getTime();
    let expiresInSeconds = Math.floor((eventStartTime - now) / 1000);
    if (expiresInSeconds <= 0) {
      // If the event is starting soon or already started, set a minimal expiry time.
      expiresInSeconds = 60;
    }

    // Generate management token
    const managementToken = jwt.sign(
      { 
        email: eventData.email.toLowerCase(),
        eventId: event.id
      },
      process.env.JWT_SECRET,
      { expiresIn: expiresInSeconds }
    );    

    // Send confirmation email
    await sendBookingConfirmation(
      event.email,
      bookingType.name,
      managementToken,
      {
        start: event.start,
        end: event.end,
        fullName: event.fullName
      }
    );

    res.json({
      success: true,
      event: {
        id: event.id,
        title: bookingType.name,
        start: event.start.toISOString(),
        end: event.end.toISOString()
      }
    });

  } catch (error) {
    console.error('Event creation error:', error);

    // Handle specific error types
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        error: 'Database error',
        code: error.code,
        meta: error.meta
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Verification token expired' });
    }

    res.status(500).json({ 
      error: 'Booking creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get User Events (Authenticated)
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        userId: req.user.userId
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true
      }
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/events/manage', authMiddleware, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.user.userId }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// Update Event (Authenticated)
app.put('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!event || event.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        start: new Date(req.body.start),
        end: new Date(req.body.end),
        fullName: req.body.fullName,
        phone: req.body.phone,
        bookingTypeId: parseInt(req.body.bookingTypeId)
      }
    });

    // Fetch the booking type to get its name for notification.
    const bookingType = await prisma.bookingType.findUnique({
      where: { id: updatedEvent.bookingTypeId }
    });

    await sendBookingUpdate(event.email, bookingType ? bookingType.name : 'Booking');
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    // Ensure the event exists and belongs to the requesting user
    if (!event || event.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    await prisma.event.delete({
      where: { id: eventId }
    });
    
    // Optionally, send a cancellation email:
    await sendBookingCancellation(event.email, event.title);
    
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public booking types endpoint
app.get('/api/booking-types', async (req, res) => {
  try {
    const types = await prisma.bookingType.findMany();
    res.json(types);
  } catch (error) {
    console.error('Error fetching booking types:', error);
    res.status(500).json({ error: 'Failed to fetch booking types' });
  }
});


// -------------------- ADMIN ROUTES --------------------
// Get all bookings
app.get('/api/admin/events', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        bookingType: true, // include the bookingType relation
        user: { select: { email: true } }
      }
    });
    // Map each event to include a computed title property using bookingType.name
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.bookingType.name, // computed title from bookingType
      bookingTypeColor: event.bookingType.color,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      fullName: event.fullName,
      email: event.email,
      phone: event.phone,
      userEmail: event.user?.email || null
    }));
    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching admin events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update any booking
app.put('/api/admin/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(req.params.id) },
      data: {
        start: new Date(req.body.start),
        end: new Date(req.body.end),
        status: req.body.status
      }
    });
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/admin/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    res.json({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete event',
      details: error.message 
    });
  }
});

// Booking Types Management
app.post('/api/admin/booking-types', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, duration, description, color } = req.body;
    const newType = await prisma.bookingType.create({
      data: {
        name,
        duration,
        description,      
        color             
      }
    });
    res.json(newType);
  } catch (error) {
    console.error('Error creating booking type:', error);
    res.status(500).json({ error: 'Failed to create booking type' });
  }
});

// Admin Create Event Endpoint with Customer Confirmation Email
app.post('/api/admin/events', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const eventData = req.body;

    // Validate required fields
    const requiredFields = ['start', 'fullName', 'email', 'phone', 'bookingTypeId'];
    const missingFields = requiredFields.filter(field => !eventData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ error: 'Missing required fields: ' + missingFields.join(', ') });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(eventData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone format (example: +852 12345678)
    const phoneRegex = /^\+\d{1,3} \d{8,15}$/;
    if (!phoneRegex.test(eventData.phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate and parse the start date
    const startDate = new Date(eventData.start);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }

    // Validate booking type and compute end time based on its duration (assumed to be in minutes)
    const bookingTypeId = parseInt(eventData.bookingTypeId);
    const bookingType = await prisma.bookingType.findUnique({ where: { id: bookingTypeId } });
    if (!bookingType) {
      return res.status(400).json({ error: 'Invalid booking type' });
    }
    const endDate = new Date(startDate.getTime() + bookingType.duration * 60 * 1000);

    // Optionally, check if a user exists with the given email to link the event to that user
    const existingUser = await prisma.user.findUnique({
      where: { email: eventData.email.toLowerCase() }
    });

    // Create the event in the database
    const event = await prisma.event.create({
      data: {
        bookingTypeId: bookingType.id,
        start: startDate,
        end: endDate,
        fullName: eventData.fullName,
        email: eventData.email.toLowerCase(),
        phone: eventData.phone,
        user: existingUser ? { connect: { id: existingUser.id } } : undefined
      }
    });

    // Generate a management token for the event so that the customer can later manage the booking.
    const now = Date.now();
    const eventStartTime = new Date(event.start).getTime();
    let expiresInSeconds = Math.floor((eventStartTime - now) / 1000);
    if (expiresInSeconds <= 0) {
      // If the event is starting soon or has already started, use a minimal expiry time.
      expiresInSeconds = 60;
    }

    const managementToken = jwt.sign(
      {
        email: event.email, // Customer's email entered by the admin
        eventId: event.id
      },
      process.env.JWT_SECRET,
      { expiresIn: expiresInSeconds }
    );

    // Send confirmation email to the customer using the email service
    await sendBookingConfirmation(
      event.email,            // Customer's email address
      bookingType.name,       // Booking type name used as event title
      managementToken,        // Token for future booking management
      {
        start: event.start,
        end: event.end,
        fullName: event.fullName
      }
    );

    res.json({
      success: true,
      event: {
        id: event.id,
        title: bookingType.name,
        start: event.start.toISOString(),
        end: event.end.toISOString()
      }
    });
  } catch (error) {
    console.error('Admin event creation error:', error);
    // Handle known Prisma errors if needed
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ error: 'Database error', code: error.code, meta: error.meta });
    }
    res.status(500).json({
      error: 'Event creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// UPDATE booking type
app.put('/api/admin/booking-types/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid bookingType ID' });
    }

    // Pull updated fields off req.body
    const { name, duration, description, color } = req.body;

    const updated = await prisma.bookingType.update({
      where: { id },
      data: {
        name,
        duration,
        description,
        color
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating booking type:', error);
    res.status(500).json({ error: 'Failed to update booking type' });
  }
});

// DELETE booking type
app.delete('/api/admin/booking-types/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid bookingType ID' });
    }

    await prisma.bookingType.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Booking type deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking type:', error);
    res.status(500).json({ error: 'Failed to delete booking type' });
  }
});

// Availability Management
app.get('/api/admin/availability', authMiddleware, adminMiddleware, async (req, res) => {
  const availability = await prisma.availability.findMany();
  res.json(availability);
});

app.put('/api/admin/availability', authMiddleware, adminMiddleware, async (req, res) => {
  const updates = req.body;
  
  await Promise.all(
    Object.entries(updates).map(([day, config]) => 
      prisma.availability.upsert({
        where: { day },
        update: config,
        create: { day, ...config }
      })
    )
  );
  
  res.json({ success: true });
});

// -------------------- SERVER START --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));