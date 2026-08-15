const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/packages                    -> all active packages from active vendors
// GET /api/packages?event_type=wedding -> filter by event type
router.get('/', async (req, res) => {
  try {
    const { event_type } = req.query;
    let query = `
      SELECT p.*, u.name AS vendor_name
      FROM packages p
      JOIN users u ON u.id = p.owner_id
      WHERE p.status = 'active' AND u.status = 'active'`;
    const params = [];
    if (event_type) {
      params.push(event_type);
      query += ` AND p.event_type = $${params.length}`;
    }
    query += ' ORDER BY p.price ASC';
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

// GET /api/packages/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.name AS vendor_name FROM packages p JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1 AND p.status = 'active' AND u.status = 'active'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch package' });
  }
});

module.exports = router;
