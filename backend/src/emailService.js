require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


const emailTemplate = (title, message) => {
    return `<div style='background-color: #ffffff; color: #000000; padding: 20px; font-family: Helvetica, Arial, sans-serif; text-align: center;'>
                <div style='max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 2px solid #FFC72C;'>
                    <h2 style='color: #000000;'>${title}</h2>
                    <p style='font-size: 16px;'>${message}</p>
                    <p style='margin-top: 20px; font-size: 12px; color: #aaaaaa;'>Powered by <strong>Rideawave Verification</strong></p>
                </div>
            </div>`;
};

const sendOtpEmail = (email, code, type) => {
    const actionMap = {
      auth: 'access your account',
      booking: 'confirm your booking'
    };

    return transporter.sendMail({
        from: `"Secure System" <noreply@keketec.com>`,
        to: email,
        subject: `Your Verification Code: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Verification Required</h2>
            <p style="font-size: 16px; color: #333;">
              Use this code to ${actionMap[type]}:
            </p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <code style="font-size: 24px; letter-spacing: 3px;">${code}</code>
            </div>
            <p style="font-size: 14px; color: #666;">
              This code will expire in 10 minutes<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `
      });
    };

const sendBookingConfirmation = async (toEmail, eventTitle, managementToken) => {
    const encodedToken = encodeURIComponent(managementToken);
    const calendarLink = `${process.env.FRONTEND_URL}/token?token=${encodedToken}`;
    
    const message = `
        <p>Your event <strong>${eventTitle}</strong> has been confirmed!</p>
        <div style="margin: 25px 0;">
            <a href="${calendarLink}" 
               style="background-color: #FFC72C; color: #000; 
                      padding: 12px 25px; text-decoration: none; 
                      border-radius: 5px; font-weight: bold;
                      display: inline-block;">
                View All Bookings
            </a>
        </div>
        <p style="font-size: 0.9em; color: #666;">
            Manage all your bookings:<br>
            ${calendarLink}
        </p>
    `;

    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>`,
        to: toEmail,
        subject: `Your Event "${eventTitle}" is Confirmed!`,
        text: `Your event "${eventTitle}" has been confirmed. Edit link: ${calendarLink}`,
        html: emailTemplate("Event Confirmation", message)
    };
    
    await transporter.sendMail(mailOptions);
};

const sendBookingUpdate = async (toEmail, eventTitle) => {
    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>` ,
        to: toEmail,
        subject: `Your Event "${eventTitle}" Has Been Updated`,
        text: `Your event "${eventTitle}" has been updated. Please check for details.`,
        html: emailTemplate("Event Update", `Your event <strong>${eventTitle}</strong> has been updated. Please check for details.`)
    };
    await transporter.sendMail(mailOptions);
};

// 📩 Booking Cancellation Email
const sendBookingCancellation = async (toEmail, eventTitle) => {
    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>`,
        to: toEmail,
        subject: `Your Event "${eventTitle}" Has Been Cancelled`,
        text: `Dear User,\n\nWe regret to inform you that your event "${eventTitle}" has been cancelled. If this was a mistake or if you need assistance, please contact support.\n\nBest Regards,\nRideawave Team`,
        html: emailTemplate("Event Cancellation Notice", 
            `Your event <strong>${eventTitle}</strong> has been cancelled. If this was a mistake, please contact support.`)
    };
    await transporter.sendMail(mailOptions);
};

// 📩 Event Reminder Email (Sent 24 hours before the event)
const sendEventReminder = async (toEmail, eventTitle, eventStart) => {
    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>`,
        to: toEmail,
        subject: `Reminder: Your Event "${eventTitle}" is Tomorrow`,
        text: `This is a friendly reminder that your event "${eventTitle}" is scheduled for ${eventStart}.`,
        html: emailTemplate("Event Reminder", 
            `This is a reminder that your event <strong>${eventTitle}</strong> is scheduled for <strong>${eventStart}</strong>.`)
    };
    await transporter.sendMail(mailOptions);
};

// 📩 Admin Notification for New Booking
const sendAdminNotification = async (adminEmail, eventTitle, customerEmail) => {
    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>`,
        to: adminEmail,
        subject: `New Event Booking: "${eventTitle}"`,
        text: `A new event "${eventTitle}" has been booked by ${customerEmail}.`,
        html: emailTemplate("New Booking Notification", 
            `A new event <strong>${eventTitle}</strong> has been booked by <strong>${customerEmail}</strong>.`)
    };
    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, sendBookingConfirmation, sendBookingUpdate, sendBookingCancellation, sendEventReminder, sendAdminNotification };
