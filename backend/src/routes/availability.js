const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/availability?date=2026-08-15
 * Returns, for every active sound set (from active vendors), whether it is
 * free or already booked on the given date. A booking blocks a sound set
 * unless it was cancelled.
 */
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Query param "date" (YYYY-MM-DD) is required' });
    }

    const { rows: soundSets } = await db.query(
      `SELECT s.*, u.name AS vendor_name
       FROM sound_sets s
       JOIN users u ON u.id = s.owner_id
       WHERE s.status = 'active' AND u.status = 'active'
       ORDER BY s.id`
    );

    const { rows: bookedRows } = await db.query(
      `SELECT sound_set_id, booking_code, customer_name, status
       FROM bookings
       WHERE event_date = $1 AND status != 'cancelled'`,
      [date]
    );

    const bookedMap = {};
    bookedRows.forEach((b) => {
      bookedMap[b.sound_set_id] = b;
    });

    const result = soundSets.map((set) => ({
      ...set,
      is_available: !bookedMap[set.id],
      booked_info: bookedMap[set.id]
        ? { booking_code: bookedMap[set.id].booking_code, status: bookedMap[set.id].status }
        : null,
    }));

    res.json({
      success: true,
      date,
      any_available: result.some((r) => r.is_available),
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to check availability' });
  }
});

module.exports = router;
