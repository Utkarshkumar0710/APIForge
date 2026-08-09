const invoiceService = require('../services/invoiceService');
const db = require('../config/database');

async function generateInvoice(req, res) {
  try {
    const userId = req.user.id;
    // For FREE plan, invoice is zero, but still create invoice record
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;

    // Count requests in billing period
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM api_requests WHERE user_id = ? AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())`,
      [userId]
    );
    const totalRequests = countRows[0].cnt || 0;

    // Subtotal for FREE plan = 0
    const subtotal = 0.00;
    const gst = 0.00;
    const total_amount = 0.00;

    // Create invoice record and generate PDF
    const invoice = await invoiceService.createInvoice({ userId, billingPeriod, totalRequests, subtotal, gst, total_amount });

    return res.json({ success: true, invoice });
  } catch (err) {
    console.error('generateInvoice error', err);
    return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
}

async function listInvoices(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT id, invoice_number, billing_period, total_requests, subtotal, gst, total_amount, status, pdf_path, created_at FROM invoices WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return res.json({ success: true, invoices: rows });
  } catch (err) {
    console.error('listInvoices error', err);
    return res.status(500).json({ success: false, message: 'Failed to list invoices.' });
  }
}

async function downloadInvoice(req, res) {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;
    const [rows] = await db.query('SELECT id, invoice_number, pdf_path, user_id FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const inv = rows[0];
    if (inv.user_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized.' });
    return res.download(inv.pdf_path);
  } catch (err) {
    console.error('downloadInvoice error', err);
    return res.status(500).json({ success: false, message: 'Failed to download invoice.' });
  }
}

async function emailInvoice(req, res) {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;
    const result = await invoiceService.emailInvoice(invoiceId, userId);
    if (!result.sent) return res.status(500).json({ success: false, message: 'Email sending failed.' });
    return res.json({ success: true, message: 'Invoice emailed.' });
  } catch (err) {
    console.error('emailInvoice error', err);
    return res.status(500).json({ success: false, message: 'Failed to email invoice.' });
  }
}

module.exports = { generateInvoice, listInvoices, downloadInvoice, emailInvoice };
