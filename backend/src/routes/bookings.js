const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { generateBookingCode, generateInvoiceNumber } = require('../utils/idGenerators');
const { sendWhatsAppReceipt } = require('../utils/notify');
const { generateInvoicePDF } = require('../utils/invoice');
const { authenticate, authorize } = require('../middleware/auth');

// How many days before/after the event date an admin is allowed to mark
// equipment as delivered (matches real-world setup/pickup windows).
const DELIVERY_WINDOW_DAYS_BEFORE = 2;
const DELIVERY_WINDOW_DAYS_AFTER = 7;

/** Adds/subtracts whole days from a YYYY-MM-DD date string, timezone-safe. */
function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Today's date as YYYY-MM-DD, using the server's local calendar day. */
function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Selects event_date as a plain YYYY-MM-DD string (no time/timezone
// component) so the frontend can bind it directly to <input type="date">
// without any Date-object round-trip that could shift it by a day.
const BOOKING_SELECT = `
  b.id, b.booking_code, b.customer_name, b.customer_phone, b.customer_email, b.customer_address,
  b.event_type, to_char(b.event_date, 'YYYY-MM-DD') AS event_date, b.event_location,
  b.package_id, b.sound_set_id, b.owner_id, b.total_amount, b.advance_percent, b.advance_amount,
  b.balance_amount, b.gst_required, b.status, b.delivery_status, b.delivered_at, b.notes,
  b.tracking_token, b.created_at, b.updated_at`;

/**
 * POST /api/bookings   (PUBLIC — customer facing)
 * Creates a new booking + records the advance (token) payment in one step.
 */
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      event_type,
      event_date,
      event_location,
      package_id,
      sound_set_id,
      advance_percent,
      payment_mode,
      transaction_id,
      gst_required,
      custom_fields,
    } = req.body;

    if (!customer_name || !customer_phone || !event_date || !package_id || !sound_set_id) {
      return res.status(400).json({
        success: false,
        message: 'customer_name, customer_phone, event_date, package_id and sound_set_id are required',
      });
    }

    // Prevent booking a date that has already passed (compared as plain date strings — no timezone math)
    if (event_date < todayDateString()) {
      return res.status(400).json({ success: false, message: 'Event date cannot be in the past' });
    }

    await client.query('BEGIN');

    // Lock check: ensure the sound set is still free on that date (race-condition safe)
    const conflictCheck = await client.query(
      `SELECT id FROM bookings WHERE sound_set_id = $1 AND event_date = $2 AND status != 'cancelled' FOR UPDATE`,
      [sound_set_id, event_date]
    );
    if (conflictCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Selected sound set is already booked for this date. Please choose another date or sound set.',
      });
    }

    const pkgResult = await client.query(
      `SELECT p.*, u.status AS owner_status FROM packages p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
      [package_id]
    );
    if (!pkgResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    const pkg = pkgResult.rows[0];
    if (pkg.owner_status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This vendor is currently unavailable' });
    }

    const setResult = await client.query('SELECT owner_id FROM sound_sets WHERE id = $1', [sound_set_id]);
    if (!setResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sound set not found' });
    }
    const ownerId = setResult.rows[0].owner_id;

    const fieldDefsResult = await client.query(
      `SELECT * FROM booking_field_defs WHERE owner_id = $1 AND status = 'active' ORDER BY display_order ASC, id ASC`,
      [ownerId]
    );
    const fieldValues = custom_fields && typeof custom_fields === 'object' ? custom_fields : {};
    const missingRequired = fieldDefsResult.rows.filter(
      (f) => f.is_required && !String(fieldValues[f.field_key] ?? '').trim()
    );
    if (missingRequired.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingRequired.map((f) => f.label_en).join(', ')}`,
      });
    }

    const totalAmount = Number(pkg.price);
    const advPercent = [20, 50].includes(Number(advance_percent)) ? Number(advance_percent) : 20;
    const advanceAmount = Math.round((totalAmount * advPercent) / 100);
    const balanceAmount = totalAmount - advanceAmount;
    const bookingCode = generateBookingCode();
    const trackingToken = crypto.randomBytes(20).toString('hex');

    const bookingInsert = await client.query(
      `INSERT INTO bookings
        (booking_code, customer_name, customer_phone, customer_email, customer_address,
         event_type, event_date, event_location, package_id, sound_set_id, owner_id,
         total_amount, advance_percent, advance_amount, balance_amount, gst_required, status, tracking_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'confirmed',$17)
       RETURNING id`,
      [
        bookingCode,
        customer_name,
        customer_phone,
        customer_email || null,
        customer_address || null,
        event_type || pkg.event_type,
        event_date,
        event_location || null,
        package_id,
        sound_set_id,
        ownerId,
        totalAmount,
        advPercent,
        advanceAmount,
        balanceAmount,
        !!gst_required,
        trackingToken,
      ]
    );
    const bookingId = bookingInsert.rows[0].id;

    await client.query(
      `INSERT INTO payments (booking_id, amount, payment_type, payment_mode, transaction_id, status)
       VALUES ($1,$2,'advance',$3,$4,'success')`,
      [bookingId, advanceAmount, payment_mode || 'UPI', transaction_id || null]
    );

    for (const def of fieldDefsResult.rows) {
      const rawValue = fieldValues[def.field_key];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') continue;
      await client.query(
        `INSERT INTO booking_field_values (booking_id, field_key, label_en, label_hi, value)
         VALUES ($1,$2,$3,$4,$5)`,
        [bookingId, def.field_key, def.label_en, def.label_hi, String(rawValue)]
      );
    }

    await client.query('COMMIT');

    const { rows: freshBookingRows } = await db.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1`, [
      bookingId,
    ]);
    const booking = freshBookingRows[0];

    // Booking is auto-confirmed as soon as the advance is recorded, so the
    // tracking link is issued to the customer right away.
    const trackingUrl = `${(process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/track/${trackingToken}`;

    const receipt = await sendWhatsAppReceipt({
      toPhone: customer_phone,
      customerName: customer_name,
      bookingCode,
      amount: advanceAmount,
      paymentType: 'Advance / एडवांस',
      trackingUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed & advance payment recorded',
      data: { ...booking, tracking_url: trackingUrl },
      whatsapp_receipt: receipt,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

// Everything below is for the OWNING admin only.
router.use(authenticate, authorize('admin'));

/**
 * GET /api/bookings -> list bookings owned by the logged-in admin.
 * Supports filters: status, event_type, event_date, date_from, date_to, phone
 * (used by the admin dashboard's "report" filter panel).
 */
router.get('/', async (req, res) => {
  try {
    const { status, event_type, event_date, date_from, date_to, phone } = req.query;
    const conditions = ['b.owner_id = $1'];
    const params = [req.user.id];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    if (event_type) {
      params.push(event_type);
      conditions.push(`b.event_type = $${params.length}`);
    }
    if (event_date) {
      params.push(event_date);
      conditions.push(`b.event_date = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`b.event_date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`b.event_date <= $${params.length}`);
    }
    if (phone) {
      params.push(`%${phone}%`);
      conditions.push(`(b.customer_phone ILIKE $${params.length} OR b.booking_code ILIKE $${params.length})`);
    }

    const query = `
      SELECT ${BOOKING_SELECT},
             p.name_en AS package_name_en, p.name_hi AS package_name_hi,
             s.name_en AS sound_set_name_en, s.name_hi AS sound_set_name_hi, s.location,
             inv.invoice_number, inv.pdf_path AS invoice_pdf_path
      FROM bookings b
      LEFT JOIN packages p ON p.id = b.package_id
      LEFT JOIN sound_sets s ON s.id = b.sound_set_id
      LEFT JOIN LATERAL (
        SELECT invoice_number, pdf_path FROM invoices WHERE booking_id = b.id ORDER BY generated_at DESC LIMIT 1
      ) inv ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.event_date DESC, b.created_at DESC`;

    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id -> single booking with payments history (owner-scoped)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ${BOOKING_SELECT},
              p.name_en AS package_name_en, p.name_hi AS package_name_hi,
              s.name_en AS sound_set_name_en, s.name_hi AS sound_set_name_hi, s.location
       FROM bookings b
       LEFT JOIN packages p ON p.id = b.package_id
       LEFT JOIN sound_sets s ON s.id = b.sound_set_id
       WHERE b.id = $1 AND b.owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { rows: payments } = await db.query(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY paid_at ASC',
      [req.params.id]
    );

    const { rows: fieldValues } = await db.query(
      'SELECT field_key, label_en, label_hi, value FROM booking_field_values WHERE booking_id = $1 ORDER BY id ASC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], payments, custom_fields: fieldValues } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
});

/**
 * PUT /api/bookings/:id  ("Update / Edit" button)
 * Lets the admin correct customer/venue details after a booking was made.
 * Body: { customer_name, customer_phone, customer_email, customer_address,
 *          event_location, event_date, notes }
 */
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { customer_name, customer_phone, customer_email, customer_address, event_location, event_date, notes } =
      req.body;

    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1 AND b.owner_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = existing.rows[0];

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot edit a cancelled booking' });
    }

    // If the event date is changing, re-check the sound set is free that day.
    // booking.event_date is already a plain 'YYYY-MM-DD' string (see BOOKING_SELECT),
    // so this is a simple, timezone-safe string comparison.
    if (event_date && event_date !== booking.event_date) {
      if (event_date < todayDateString()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Event date cannot be in the past' });
      }
      const conflict = await client.query(
        `SELECT id FROM bookings WHERE sound_set_id = $1 AND event_date = $2 AND status != 'cancelled' AND id != $3`,
        [booking.sound_set_id, event_date, booking.id]
      );
      if (conflict.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'This sound set is already booked on the new date' });
      }
    }

    await client.query(
      `UPDATE bookings SET
         customer_name = COALESCE($1, customer_name),
         customer_phone = COALESCE($2, customer_phone),
         customer_email = COALESCE($3, customer_email),
         customer_address = COALESCE($4, customer_address),
         event_location = COALESCE($5, event_location),
         event_date = COALESCE($6, event_date),
         notes = COALESCE($7, notes),
         updated_at = NOW()
       WHERE id = $8 AND owner_id = $9`,
      [
        customer_name || null,
        customer_phone || null,
        customer_email || null,
        customer_address || null,
        event_location || null,
        event_date || null,
        notes || null,
        req.params.id,
        req.user.id,
      ]
    );

    const updated = await client.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1`, [req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Booking updated', data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/bookings/:id/delivery — Body: { delivered: true }
 * Only allowed within a window around the event date:
 * from (event_date - 2 days) to (event_date + 7 days).
 */
router.patch('/:id/delivery', async (req, res) => {

  console.log("🔥 DELIVERY ROUTE HIT");
  console.log("ID:", req.params.id);
  console.log("BODY:", req.body);

  try {
    const { delivered } = req.body;

    // Convert URL/user IDs from string to integer
    const bookingId = Number(req.params.id);
    const ownerId = Number(req.user.id);

    console.log("BOOKING ID:", bookingId, typeof bookingId);
    console.log("OWNER ID:", ownerId, typeof ownerId);
    console.log("DELIVERED:", delivered, typeof delivered);

    // Validate booking ID
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    // Validate owner ID
    if (!Number.isInteger(ownerId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // ---------------------------------------------------
    // 1. GET EXISTING BOOKING
    // ---------------------------------------------------

    const existing = await db.query(
      `SELECT ${BOOKING_SELECT}
       FROM bookings b
       WHERE b.id = $1::integer
       AND b.owner_id = $2::integer`,
      [bookingId, ownerId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = existing.rows[0];

    console.log("🔥 EXISTING BOOKING FOUND:", booking.id);

    // ---------------------------------------------------
    // 2. CHECK CANCELLED BOOKING
    // ---------------------------------------------------

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update delivery status of a cancelled booking'
      });
    }

    // ---------------------------------------------------
    // 3. CHECK ALREADY DELIVERED
    // ---------------------------------------------------

    if (
      delivered === true &&
      booking.delivery_status === 'delivered'
    ) {
      return res.status(400).json({
        success: false,
        message: 'This booking is already marked as delivered'
      });
    }

    // ---------------------------------------------------
    // 4. DELIVERY DATE WINDOW CHECK
    // ---------------------------------------------------

    if (delivered === true) {

      const windowStart = addDaysToDateString(
        booking.event_date,
        -DELIVERY_WINDOW_DAYS_BEFORE
      );

      const windowEnd = addDaysToDateString(
        booking.event_date,
        DELIVERY_WINDOW_DAYS_AFTER
      );

      const today = todayDateString();

      console.log("📅 DELIVERY WINDOW");
      console.log("Today:", today);
      console.log("Start:", windowStart);
      console.log("End:", windowEnd);

      if (today < windowStart || today > windowEnd) {
        return res.status(400).json({
          success: false,
          message: `You can only mark this booking delivered between ${windowStart} and ${windowEnd} (event date ± delivery window)`,
          window_start: windowStart,
          window_end: windowEnd,
        });
      }
    }

    // ---------------------------------------------------
    // 5. UPDATE DELIVERY STATUS
    // ---------------------------------------------------

    const deliveryStatus = delivered === true
      ? 'delivered'
      : 'not_delivered';

    console.log("🔥 NEW DELIVERY STATUS:", deliveryStatus);

    const { rows } = await db.query(
      `UPDATE bookings
       SET delivery_status = $1::varchar,
           delivered_at = CASE
             WHEN $1::varchar = 'delivered'
             THEN NOW()
             ELSE delivered_at
           END,
           updated_at = NOW()
       WHERE id = $2::integer
       AND owner_id = $3::integer
       RETURNING id`,
      [
        deliveryStatus,
        bookingId,
        ownerId
      ]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    console.log("✅ DELIVERY STATUS UPDATED:", rows[0].id);

    // ---------------------------------------------------
    // 6. GET UPDATED BOOKING
    // ---------------------------------------------------

    const updated = await db.query(
      `SELECT ${BOOKING_SELECT}
       FROM bookings b
       WHERE b.id = $1::integer`,
      [bookingId]
    );

    // ---------------------------------------------------
    // 7. SUCCESS RESPONSE
    // ---------------------------------------------------

    return res.json({
      success: true,
      message: 'Delivery status updated',
      data: updated.rows[0]
    });

  } catch (err) {

    console.error("🔥🔥 DELIVERY UPDATE ERROR 🔥🔥");
    console.error("MESSAGE:", err.message);
    console.error("CODE:", err.code);
    console.error("DETAIL:", err.detail);
    console.error("HINT:", err.hint);
    console.error("STACK:", err.stack);

    return res.status(500).json({
      success: false,
      message: err.message,
      code: err.code
    });
  }
});

/**
 * POST /api/bookings/:id/balance-payment
 * Records the balance payment collected on the event day and generates
 * the final GST / Non-GST invoice.
 */
router.post('/:id/balance-payment', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { payment_mode, transaction_id } = req.body;
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1 AND b.owner_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = bookingResult.rows[0];

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot collect balance for a cancelled booking' });
    }
    if (Number(booking.balance_amount) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No balance due for this booking' });
    }

    await client.query(
      `INSERT INTO payments (booking_id, amount, payment_type, payment_mode, transaction_id, status)
       VALUES ($1,$2,'balance',$3,$4,'success')`,
      [booking.id, booking.balance_amount, payment_mode || 'Cash', transaction_id || null]
    );

    await client.query(
      `UPDATE bookings SET balance_amount = 0, status = 'completed', updated_at = NOW() WHERE id = $1`,
      [booking.id]
    );
    const updatedBooking = await client.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1`, [
      booking.id,
    ]);

    const countResult = await client.query('SELECT COUNT(*) FROM invoices');
    const nextSeq = Number(countResult.rows[0].count) + 1;
    const invoiceNumber = generateInvoiceNumber(nextSeq);

    const gstPercent = booking.gst_required ? Number(process.env.GST_PERCENT || 18) : 0;
    const subtotal = Number(booking.total_amount);
    const gstAmount = booking.gst_required ? Math.round((subtotal * gstPercent) / 100) : 0;
    const totalWithGst = subtotal + gstAmount;

    const pdfPath = await generateInvoicePDF({
      booking: updatedBooking.rows[0],
      invoiceNumber,
      isGst: booking.gst_required,
      subtotal,
      gstPercent,
      gstAmount,
      totalAmount: totalWithGst,
    });

    const invoiceInsert = await client.query(
      `INSERT INTO invoices (booking_id, invoice_number, is_gst, subtotal, gst_percent, gst_amount, total_amount, pdf_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [booking.id, invoiceNumber, booking.gst_required, subtotal, gstPercent, gstAmount, totalWithGst, pdfPath]
    );

    await client.query('COMMIT');

    const trackingUrl = booking.tracking_token
      ? `${(process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/track/${booking.tracking_token}`
      : undefined;

    const receipt = await sendWhatsAppReceipt({
      toPhone: booking.customer_phone,
      customerName: booking.customer_name,
      bookingCode: booking.booking_code,
      amount: booking.balance_amount,
      paymentType: 'Balance / बैलेंस',
      trackingUrl,
    });

    res.json({
      success: true,
      message: 'Balance payment recorded & invoice generated',
      data: { booking: updatedBooking.rows[0], invoice: invoiceInsert.rows[0] },
      whatsapp_receipt: receipt,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record balance payment' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  try {
    const existing = await db.query('SELECT status FROM bookings WHERE id = $1 AND owner_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (existing.rows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled' });
    }
    if (existing.rows[0].status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' });
    }

    const { rows } = await db.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const updated = await db.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Booking cancelled', data: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

module.exports = router;
