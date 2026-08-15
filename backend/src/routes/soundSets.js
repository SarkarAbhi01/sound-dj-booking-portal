const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/sound-sets -> all active sound sets from active vendors (public, customer-facing)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name AS vendor_name
       FROM sound_sets s
       JOIN users u ON u.id = s.owner_id
       WHERE s.status = 'active' AND u.status = 'active'
       ORDER BY s.id`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch sound sets' });
  }
});

module.exports = router;
