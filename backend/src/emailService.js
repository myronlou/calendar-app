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

const sendVerificationEmail = async (toEmail, otpCode) => {
    const mailOptions = {
        from: `"Verify Bot" <noreply@keketec.com>`,
        to: toEmail,
        subject: `Your Code is ${otpCode}`,
        text: `Your OTP: ${otpCode} (expires in 10 minutes)`,
        html: emailTemplate("To verify your email address, please use the following One Time Password (OTP):", `<div style='font-size: 24px; font-weight: bold; background: #FFC72C; padding: 15px; border-radius: 5px; display: inline-block; color: #000000;'>${otpCode}</div>`)
    };
    await transporter.sendMail(mailOptions);
};

const sendBookingConfirmation = async (toEmail, eventTitle) => {
    const mailOptions = {
        from: `"Rideawave" <noreply@keketec.com>`,
        to: toEmail,
        subject: `Your Event "${eventTitle}" is Confirmed!`,
        text: `Your event "${eventTitle}" has been successfully scheduled.`,
        html: emailTemplate("Event Confirmation", `Your event <strong>${eventTitle}</strong> has been successfully scheduled! Please mark it in your calendar.`)
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

module.exports = { sendVerificationEmail, sendBookingConfirmation, sendBookingUpdate };
