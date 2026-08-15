const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

/**
 * POST /api/payments/generate-qr
 * Generates a scannable UPI QR code (data URL) for the given amount.
 * In production, replace the UPI_ID below with your real business UPI ID,
 * or swap this for a PhonePe/GooglePay/Razorpay payment-link API call.
 * Body: { amount, note }
 */
router.post('/generate-qr', async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required' });

    const upiId = process.env.COMPANY_UPI_ID || 'sounddj@upi';
    const payeeName = encodeURIComponent(process.env.COMPANY_NAME || 'Sound DJ Services');
    const upiString = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${encodeURIComponent(
      note || 'Booking Advance'
    )}`;

    const qrDataUrl = await QRCode.toDataURL(upiString);
    res.json({ success: true, data: { upi_string: upiString, qr_code: qrDataUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
});

module.exports = router;
