require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true if using port 465, false otherwise
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send OTP verification email
async function sendVerificationEmail(toEmail, otpCode) {
  const mailOptions = {
    from: `"Verify Bot" <noreply@keketec.com>`,
    to: toEmail,
    subject: `Your Code is ${otpCode}`,
    text: `To verify your email address, please use the following One Time Password (OTP):
    
    ${otpCode}
    
    Code expires within 10 minutes

    Do not share this OTP with anyone. Rideawave Verification takes your account security very seriously. Rideawave Customer Service will never ask you to disclose or verify your Rideawave password, OTP, credit card, or banking account number. If you receive a suspicious email with a link to update your account information, do not click on the link—instead, report the email to Rideawave for investigation.

Powered by Rideawave Verification`,
    html: `
      <div style="background-color: #ffffff; color: #000000; padding: 20px; font-family: Helvetica, Arial, sans-serif; text-align: center;">
        <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h2 style="color: #000000; font-family: Helvetica, Arial, sans-serif;">To verify your email address, please use the following One Time Password (OTP):</h2>
          <div style="font-size: 24px; font-weight: bold; background: #FFC72C; padding: 15px; border-radius: 5px; display: inline-block; color: #000000; font-family: Helvetica, Arial, sans-serif;">${otpCode}</div>
          <p style="margin-top: 10px; font-size: 14px; font-family: Helvetica, Arial, sans-serif;">Code expires within <strong>10 minutes</strong></p>
          <p style="color: #ff4d4d; font-weight: bold; font-family: Helvetica, Arial, sans-serif;">Do not share this OTP with anyone.</p>
          <p style="text-align: left; font-size: 14px; font-family: Helvetica, Arial, sans-serif;">
            Rideawave Verification takes your account security very seriously. Rideawave Customer Service will never ask you to disclose or verify your Rideawave password, OTP, credit card, or banking account number.
          </p>
          <p style="text-align: left; font-size: 14px; font-family: Helvetica, Arial, sans-serif;">
            If you receive a suspicious email with a link to update your account information, <strong>do not click on the link</strong>—instead, report the email to Rideawave for investigation.
          </p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #aaaaaa; font-family: Helvetica, Arial, sans-serif;">Powered by <strong>Rideawave Verification</strong></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Function to send event confirmation email
async function sendEventConfirmationEmail(toEmail, eventTitle) {
  const mailOptions = {
    from: `"Rideawave" <noreply@keketec.com>`,
    to: toEmail,
    subject: `Your Event "${eventTitle}" is Confirmed!`,
    text: `Dear User,

Your event "${eventTitle}" has been successfully scheduled.

Please ensure you mark this in your calendar. If you need to make any changes, please reach out to support.

Thank you for using Rideawave.

Best,
Rideawave Team`,
    html: `
      <div style="background-color: #ffffff; color: #000000; padding: 20px; font-family: Helvetica, Arial, sans-serif; text-align: center;">
        <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h2 style="color: #000000; font-family: Helvetica, Arial, sans-serif;">Your Event is Confirmed</h2>
          <p style="font-size: 16px; font-family: Helvetica, Arial, sans-serif;">
            Your event "<strong>${eventTitle}</strong>" has been successfully scheduled!
          </p>
          <p style="margin-top: 10px; font-size: 14px; font-family: Helvetica, Arial, sans-serif;">
            Please ensure you mark this in your calendar. If you need to make any changes, please reach out to support.
          </p>
          <p style="text-align: left; font-size: 14px; font-family: Helvetica, Arial, sans-serif;">
            Thank you for using Rideawave.
          </p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #aaaaaa; font-family: Helvetica, Arial, sans-serif;">Best, <br/><strong>Rideawave Team</strong></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendEventConfirmationEmail,
};

