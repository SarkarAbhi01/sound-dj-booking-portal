const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const slugify = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

/**
 * GET /api/booking-fields/by-package/:packageId   (PUBLIC — customer facing)
 * Returns the active custom fields the vendor owning this package wants to
 * collect from the customer at booking time.
 */
router.get('/by-package/:packageId', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, f.field_key, f.label_en, f.label_hi, f.field_type, f.options, f.is_required, f.display_order
       FROM booking_field_defs f
       JOIN packages p ON p.owner_id = f.owner_id
       WHERE p.id = $1 AND f.status = 'active'
       ORDER BY f.display_order ASC, f.id ASC`,
      [req.params.packageId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking fields' });
  }
});

// Everything below is for the OWNING admin only.
router.use(authenticate, authorize('admin'));

// GET /api/booking-fields -> list this admin's own field definitions
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM booking_field_defs WHERE owner_id = $1 ORDER BY display_order ASC, id ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking fields' });
  }
});

// POST /api/booking-fields -> add a new custom field
router.post('/', async (req, res) => {
  try {
    const { label_en, label_hi, field_type, options, is_required, display_order } = req.body;
    if (!label_en || !label_hi) {
      return res.status(400).json({ success: false, message: 'label_en and label_hi are required' });
    }
    const type = ['text', 'number', 'textarea', 'date', 'select', 'checkbox'].includes(field_type)
      ? field_type
      : 'text';

    let fieldKey = slugify(label_en) || `field_${Date.now()}`;
    // ensure uniqueness for this owner
    const existing = await db.query('SELECT id FROM booking_field_defs WHERE owner_id = $1 AND field_key = $2', [
      req.user.id,
      fieldKey,
    ]);
    if (existing.rows.length) fieldKey = `${fieldKey}_${Date.now().toString().slice(-4)}`;

    const { rows } = await db.query(
      `INSERT INTO booking_field_defs (owner_id, field_key, label_en, label_hi, field_type, options, is_required, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id,
        fieldKey,
        label_en,
        label_hi,
        type,
        type === 'select' ? options || '' : null,
        !!is_required,
        Number(display_order) || 0,
      ]
    );
    res.status(201).json({ success: true, message: 'Booking field added', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add booking field' });
  }
});

// PUT /api/booking-fields/:id -> edit a custom field
router.put('/:id', async (req, res) => {
  try {
    const { label_en, label_hi, field_type, options, is_required, display_order } = req.body;
    const type = field_type && ['text', 'number', 'textarea', 'date', 'select', 'checkbox'].includes(field_type)
      ? field_type
      : null;

    const { rows } = await db.query(
      `UPDATE booking_field_defs SET
         label_en = COALESCE($1, label_en), label_hi = COALESCE($2, label_hi),
         field_type = COALESCE($3, field_type),
         options = CASE WHEN $3 = 'select' THEN $4 ELSE options END,
         is_required = COALESCE($5, is_required),
         display_order = COALESCE($6, display_order),
         updated_at = NOW()
       WHERE id = $7 AND owner_id = $8 RETURNING *`,
      [
        label_en || null,
        label_hi || null,
        type,
        options || null,
        typeof is_required === 'boolean' ? is_required : null,
        display_order !== undefined ? Number(display_order) : null,
        req.params.id,
        req.user.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking field not found' });
    res.json({ success: true, message: 'Booking field updated', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update booking field' });
  }
});

// PATCH /api/booking-fields/:id/status -> Body: { status: 'active' | 'inactive' }
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }
    const { rows } = await db.query(
      `UPDATE booking_field_defs SET status = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking field not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update booking field status' });
  }
});

// DELETE /api/booking-fields/:id -> permanently remove a custom field definition
// (already-collected values on past bookings are kept intact since they are
// snapshotted independently in booking_field_values).
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM booking_field_defs WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking field not found' });
    res.json({ success: true, message: 'Booking field removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove booking field' });
  }
});

module.exports = router;
