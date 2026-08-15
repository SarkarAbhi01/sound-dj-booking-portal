const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendOtpMessage } = require('../utils/notify');

const BOOKING_DETAIL_QUERY = `
  SELECT b.id, b.booking_code, b.customer_name, b.customer_phone, b.event_type, b.event_date,
         b.event_location, b.total_amount, b.advance_amount, b.balance_amount, b.status,
         b.delivery_status, b.delivered_at, b.gst_required, b.created_at, b.tracking_token,
         p.name_en AS package_name_en, p.name_hi AS package_name_hi,
         s.name_en AS sound_set_name_en, s.name_hi AS sound_set_name_hi, s.location,
         u.name AS vendor_name, u.phone AS vendor_phone
  FROM bookings b
  LEFT JOIN packages p ON p.id = b.package_id
  LEFT JOIN sound_sets s ON s.id = b.sound_set_id
  LEFT JOIN users u ON u.id = b.owner_id
`;

async function buildTrackingPayload(booking) {
  const { rows: payments } = await db.query(
    'SELECT amount, payment_type, payment_mode, status, paid_at FROM payments WHERE booking_id = $1 ORDER BY paid_at ASC',
    [booking.id]
  );
  const { rows: feedbackRows } = await db.query(
    'SELECT id FROM booking_feedback WHERE booking_id = $1 LIMIT 1',
    [booking.id]
  );
  const { tracking_token, ...safeBooking } = booking;
  return { ...safeBooking, payments, feedback_submitted: feedbackRows.length > 0, tracking_token };
}

/**
 * GET /api/track/:token   (PUBLIC)
 * Booking Tracking Link — the fastest way for a customer to check status:
 * they just open the link they received on WhatsApp.
 */
router.get('/:token', async (req, res) => {
  try {
    const { rows } = await db.query(`${BOOKING_DETAIL_QUERY} WHERE b.tracking_token = $1`, [req.params.token]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Tracking link not found or expired' });
    }
    res.json({ success: true, data: await buildTrackingPayload(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking status' });
  }
});

/**
 * POST /api/track/lookup   (PUBLIC)
 * "Booking ID + Mobile Number" lookup.
 * Body: { booking_code, customer_phone }
 */
router.post('/lookup', async (req, res) => {
  try {
    const { booking_code, customer_phone } = req.body;
    if (!booking_code || !customer_phone) {
      return res.status(400).json({ success: false, message: 'booking_code and customer_phone are required' });
    }
    const { rows } = await db.query(
      `${BOOKING_DETAIL_QUERY} WHERE b.booking_code = $1 AND b.customer_phone = $2`,
      [booking_code.trim(), customer_phone.trim()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No booking found for this Booking ID and Mobile Number' });
    }
    res.json({ success: true, data: await buildTrackingPayload(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking status' });
  }
});

/**
 * POST /api/track/request-otp   (PUBLIC)
 * "Booking ID + OTP" lookup, step 1: send a one-time password to the
 * customer's phone (mock WhatsApp by default — see utils/notify.js).
 * Body: { booking_code, customer_phone }
 */
router.post('/request-otp', async (req, res) => {
  try {
    const { booking_code, customer_phone } = req.body;
    if (!booking_code || !customer_phone) {
      return res.status(400).json({ success: false, message: 'booking_code and customer_phone are required' });
    }
    const { rows } = await db.query('SELECT id FROM bookings WHERE booking_code = $1 AND customer_phone = $2', [
      booking_code.trim(),
      customer_phone.trim(),
    ]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No booking found for this Booking ID and Mobile Number' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query('UPDATE bookings SET otp_code_hash = $1, otp_expires_at = $2 WHERE id = $3', [
      otpHash,
      expiresAt,
      rows[0].id,
    ]);

    const smsResult = await sendOtpMessage({ toPhone: customer_phone, bookingCode: booking_code, otp });

    res.json({ success: true, message: 'OTP sent to your WhatsApp number', whatsapp: smsResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

/**
 * POST /api/track/verify-otp   (PUBLIC)
 * "Booking ID + OTP" lookup, step 2: verify the OTP and return status.
 * Body: { booking_code, otp }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { booking_code, otp } = req.body;
    if (!booking_code || !otp) {
      return res.status(400).json({ success: false, message: 'booking_code and otp are required' });
    }
    const { rows } = await db.query(`${BOOKING_DETAIL_QUERY} WHERE b.booking_code = $1`, [booking_code.trim()]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const { rows: otpRows } = await db.query(
      'SELECT otp_code_hash, otp_expires_at FROM bookings WHERE id = $1',
      [rows[0].id]
    );
    const { otp_code_hash, otp_expires_at } = otpRows[0];
    if (!otp_code_hash || !otp_expires_at || new Date(otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    const isMatch = await bcrypt.compare(otp, otp_code_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }

    // OTP is single-use — clear it once verified.
    await db.query('UPDATE bookings SET otp_code_hash = NULL, otp_expires_at = NULL WHERE id = $1', [rows[0].id]);

    res.json({ success: true, data: await buildTrackingPayload(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

/**
 * POST /api/track/:token/feedback   (PUBLIC)
 * Lets the customer send feedback/suggestions from their tracking page —
 * it reaches the owning admin's dashboard.
 * Body: { message, rating? (1-5) }
 */
router.post('/:token/feedback', async (req, res) => {
  try {
    const { message, rating } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Feedback message is required' });
    }

    const { rows } = await db.query('SELECT id, owner_id FROM bookings WHERE tracking_token = $1', [
      req.params.token,
    ]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Tracking link not found or expired' });
    }

    const ratingValue = Number(rating);
    const { rows: inserted } = await db.query(
      `INSERT INTO booking_feedback (booking_id, owner_id, rating, message)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [rows[0].id, rows[0].owner_id, ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null, message.trim()]
    );

    res.status(201).json({ success: true, message: 'Thank you! Your feedback has been sent.', data: inserted[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

module.exports = router;
