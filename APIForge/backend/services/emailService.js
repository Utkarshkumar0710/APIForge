const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM;

let transporter = null;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendInvoiceEmail(toEmail, toName, pdfPath, invoiceNumber) {
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `APIForge Invoice #${invoiceNumber}`,
    text: `Hello ${toName},\n\nYour APIForge invoice has been generated. Please find attached.\n\nRegards,\nAPIForge`,
    attachments: [
      { filename: `${invoiceNumber}.pdf`, path: pdfPath }
    ]
  });
  return info;
}

module.exports = { sendInvoiceEmail };
