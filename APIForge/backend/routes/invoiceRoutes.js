const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware, invoiceController.generateInvoice);
router.get('/', authMiddleware, invoiceController.listInvoices);
router.get('/:id/download', authMiddleware, invoiceController.downloadInvoice);
router.post('/:id/email', authMiddleware, invoiceController.emailInvoice);

module.exports = router;
