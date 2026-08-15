const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/summary
 * Overview numbers for the logged-in admin's own dashboard.
 *
 * Revenue accounting (kept internally consistent):
 *   total_advance_received = SUM(advance_amount) for non-cancelled bookings
 *   total_balance_pending  = SUM(balance_amount) for non-cancelled bookings
 *                             (this is 0 for completed bookings, since the
 *                             balance was already collected)
 *   total_revenue           = total_advance_received + total_balance_pending
 *                             (always holds true by construction)
 *   cancelled_advance_amount / cancelled_balance_amount = money tied up in
 *   cancelled bookings, shown separately so it's never mixed into revenue.
 */
router.get('/summary', async (req, res) => {
  try {
    const totals = await db.query(
      `SELECT
        COALESCE(SUM(advance_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_advance_received,
        COALESCE(SUM(balance_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_balance_pending,
        COALESCE(SUM(advance_amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_advance_amount,
        COALESCE(SUM(balance_amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_balance_amount,
        COUNT(*) FILTER (WHERE status != 'cancelled') AS total_bookings,
        COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE AND status != 'cancelled') AS upcoming_events,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_events,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_events
      FROM bookings WHERE owner_id = $1`,
      [req.user.id]
    );
    const row = totals.rows[0];
    const totalAdvanceReceived = Number(row.total_advance_received);
    const totalBalancePending = Number(row.total_balance_pending);

    const upcoming = await db.query(
      `SELECT b.id, b.booking_code, b.customer_name, b.customer_phone, b.event_type,
             to_char(b.event_date, 'YYYY-MM-DD') AS event_date,
             b.event_location, b.advance_amount, b.balance_amount, b.status, b.delivery_status,
             s.name_en AS sound_set_name_en, s.name_hi AS sound_set_name_hi, s.location
      FROM bookings b
      LEFT JOIN sound_sets s ON s.id = b.sound_set_id
      WHERE b.owner_id = $1 AND b.event_date >= CURRENT_DATE AND b.status != 'cancelled'
      ORDER BY b.event_date ASC
      LIMIT 20`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...row,
        total_advance_received: totalAdvanceReceived,
        total_balance_pending: totalBalancePending,
        total_revenue: totalAdvanceReceived + totalBalancePending,
        cancelled_total_amount: Number(row.cancelled_advance_amount) + Number(row.cancelled_balance_amount),
        upcoming_bookings: upcoming.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load admin summary' });
  }
});

/**
 * GET /api/admin/sound-set-tracker?date=2026-08-15
 * Shows, for a given date (defaults to today), which of THIS admin's
 * sound sets went where.
 */
router.get('/sound-set-tracker', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(
      `SELECT b.booking_code, b.customer_name, b.customer_phone, b.event_type, b.event_location,
              b.advance_amount, b.balance_amount, b.status, b.delivery_status,
              s.name_en AS sound_set_name_en, s.name_hi AS sound_set_name_hi, s.location
       FROM bookings b
       LEFT JOIN sound_sets s ON s.id = b.sound_set_id
       WHERE b.owner_id = $1 AND b.event_date = $2 AND b.status != 'cancelled'
       ORDER BY s.id`,
      [req.user.id, date]
    );
    res.json({ success: true, date, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load sound set tracker' });
  }
});

/**
 * GET /api/admin/feedback
 * Customer feedback/suggestions submitted from booking tracking pages,
 * scoped to this admin's own bookings.
 */
router.get('/feedback', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, f.rating, f.message, f.created_at,
              b.booking_code, b.customer_name, b.customer_phone,
              to_char(b.event_date, 'YYYY-MM-DD') AS event_date
       FROM booking_feedback f
       JOIN bookings b ON b.id = f.booking_id
       WHERE f.owner_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load feedback' });
  }
});

module.exports = router;
