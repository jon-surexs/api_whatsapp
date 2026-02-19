// src/services/emailService.js
const nodemailer = require("nodemailer");

const getBool = (v) => String(v || "").toLowerCase() === "true";

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = getBool(process.env.SMTP_SECURE);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP config missing (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  const enabled = getBool(process.env.EMAIL_ENABLED);
  if (!enabled) {
    return { skipped: true, messageId: null };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { skipped: false, messageId: info.messageId || null };
};

module.exports = { sendEmail };
