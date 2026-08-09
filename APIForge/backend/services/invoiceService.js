const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const emailService = require('./emailService');

async function createInvoice({ userId, billingPeriod, totalRequests, subtotal, gst, total_amount }) {
  // generate invoice number
  const now = new Date();
  const serial = now.getTime();
  const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}-${serial}`;

  // ensure invoices dir
  const invoicesDir = path.join(__dirname, '..', '..', 'invoices');
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const filename = `${invoiceNumber}.pdf`;
  const filepath = path.join(invoicesDir, filename);

  // fetch user details
  const [users] = await db.query('SELECT full_name, email, phone FROM users WHERE id = ? LIMIT 1', [userId]);
  const user = users[0];

  // create pdf
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  doc.fontSize(20).text('APIForge', { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).text('Real-Time API Integration & Usage Platform');
  doc.text('Founded & Developed by Utkarsh Kumar');
  doc.moveDown();

  doc.fontSize(14).text(`Invoice: ${invoiceNumber}`);
  doc.text(`Date: ${now.toISOString().slice(0,10)}`);
  doc.text(`Billing Period: ${billingPeriod}`);
  doc.moveDown();

  doc.text(`Customer: ${user.full_name}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Phone: ${user.phone || '-'}`);
  doc.moveDown();

  doc.text(`Plan: FREE`);
  doc.text(`API Requests: ${totalRequests}`);
  doc.moveDown();

  doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`);
  doc.text(`GST: ₹${gst.toFixed(2)}`);
  doc.text(`Total: ₹${total_amount.toFixed(2)}`);
  doc.moveDown();

  doc.text('Status: FREE');
  doc.moveDown();
  doc.text('Thank you for using APIForge. Founded & Developed by Utkarsh Kumar.');

  doc.end();

  // wait for stream finish
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // insert into DB
  const [result] = await db.query('INSERT INTO invoices (invoice_number, user_id, billing_period, total_requests, subtotal, gst, total_amount, status, pdf_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [invoiceNumber, userId, billingPeriod, totalRequests, subtotal, gst, total_amount, 'FREE', filepath]);
  const invoiceId = result.insertId;

  const invoiceRecord = { id: invoiceId, invoice_number: invoiceNumber, pdf_path: filepath };

  // attempt to email; emailService will check config
  try {
    await emailService.sendInvoiceEmail(user.email, user.full_name, filepath, invoiceNumber);
  } catch (e) {
    console.warn('Email send failed (ignored):', e.message || e);
  }

  return invoiceRecord;
}

async function emailInvoice(invoiceId, userId) {
  // fetch invoice and user
  const [rows] = await db.query('SELECT i.id, i.invoice_number, i.pdf_path, u.email, u.full_name FROM invoices i JOIN users u ON i.user_id = u.id WHERE i.id = ? AND u.id = ? LIMIT 1', [invoiceId, userId]);
  if (!rows.length) return { sent: false };
  const inv = rows[0];
  try {
    await emailService.sendInvoiceEmail(inv.email, inv.full_name, inv.pdf_path, inv.invoice_number);
    return { sent: true };
  } catch (err) {
    console.error('emailInvoice error', err);
    return { sent: false };
  }
}

module.exports = { createInvoice, emailInvoice };
