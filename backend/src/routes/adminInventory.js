const express = require('express');
const router = express.Router();
const db = require('../db');
const { upload } = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

const toPublicUrl = (file) => (file ? `/uploads/${file.filename}` : null);

/* =========================================================
   SOUND EQUIPMENT (sound_sets) — owned by the logged-in admin
   ========================================================= */

// GET /api/admin/equipment?status=active&search=bass
router.get('/equipment', async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = ['owner_id = $1'];
    const params = [req.user.id];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name_en ILIKE $${params.length} OR name_hi ILIKE $${params.length})`);
    }

    const { rows } = await db.query(
      `SELECT * FROM sound_sets WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch equipment' });
  }
});

// POST /api/admin/equipment  (multipart/form-data, "image" field optional)
router.post('/equipment', upload.single('image'), async (req, res) => {
  try {
    const { name_en, name_hi, description_en, description_hi, location } = req.body;
    if (!name_en || !name_hi) {
      return res.status(400).json({ success: false, message: 'name_en and name_hi are required' });
    }
    const imageUrl = toPublicUrl(req.file);

    const { rows } = await db.query(
      `INSERT INTO sound_sets (owner_id, name_en, name_hi, description_en, description_hi, location, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name_en, name_hi, description_en || null, description_hi || null, location || 'Warehouse', imageUrl]
    );
    res.status(201).json({ success: true, message: 'Equipment added', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Failed to add equipment' });
  }
});

// PUT /api/admin/equipment/:id  (multipart/form-data, "image" field optional)
router.put('/equipment/:id', upload.single('image'), async (req, res) => {
  try {
    const { name_en, name_hi, description_en, description_hi, location } = req.body;
    const imageUrl = toPublicUrl(req.file);

    const { rows } = await db.query(
      `UPDATE sound_sets SET
         name_en = COALESCE($1, name_en), name_hi = COALESCE($2, name_hi),
         description_en = COALESCE($3, description_en), description_hi = COALESCE($4, description_hi),
         location = COALESCE($5, location),
         image_url = COALESCE($6, image_url),
         updated_at = NOW()
       WHERE id = $7 AND owner_id = $8 RETURNING *`,
      [name_en || null, name_hi || null, description_en || null, description_hi || null, location || null, imageUrl, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment updated', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update equipment' });
  }
});

// PATCH /api/admin/equipment/:id/status  Body: { status: 'active' | 'inactive' } — soft delete
router.patch('/equipment/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }
    const { rows } = await db.query(
      `UPDATE sound_sets SET status = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: `Equipment marked as ${status}`, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update equipment status' });
  }
});

// GET /api/admin/equipment/:id
router.get('/equipment/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sound_sets WHERE id = $1 AND owner_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch equipment' });
  }
});

/* =========================================================
   EVENT PACKAGES — owned by the logged-in admin
   ========================================================= */

// GET /api/admin/packages?status=active&event_type=wedding&search=grand
router.get('/packages', async (req, res) => {
  try {
    const { status, event_type, search } = req.query;
    const conditions = ['owner_id = $1'];
    const params = [req.user.id];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (event_type) {
      params.push(event_type);
      conditions.push(`event_type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name_en ILIKE $${params.length} OR name_hi ILIKE $${params.length})`);
    }

    const { rows } = await db.query(
      `SELECT * FROM packages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

// POST /api/admin/packages  (multipart/form-data, "image" field optional)
router.post('/packages', upload.single('image'), async (req, res) => {
  try {
    const { name_en, name_hi, event_type, items_en, items_hi, description_en, description_hi, price } = req.body;
    if (!name_en || !name_hi || !event_type || !items_en || !items_hi || !price) {
      return res.status(400).json({
        success: false,
        message: 'name_en, name_hi, event_type, items_en, items_hi and price are required',
      });
    }
    const imageUrl = toPublicUrl(req.file);

    const { rows } = await db.query(
      `INSERT INTO packages (owner_id, name_en, name_hi, event_type, items_en, items_hi, description_en, description_hi, price, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.user.id,
        name_en,
        name_hi,
        event_type,
        items_en,
        items_hi,
        description_en || null,
        description_hi || null,
        price,
        imageUrl,
      ]
    );
    res.status(201).json({ success: true, message: 'Package added', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Failed to add package' });
  }
});

// PUT /api/admin/packages/:id  (multipart/form-data, "image" field optional)
router.put('/packages/:id', upload.single('image'), async (req, res) => {
  try {
    const { name_en, name_hi, event_type, items_en, items_hi, description_en, description_hi, price } = req.body;
    const imageUrl = toPublicUrl(req.file);

    const { rows } = await db.query(
      `UPDATE packages SET
         name_en = COALESCE($1, name_en), name_hi = COALESCE($2, name_hi),
         event_type = COALESCE($3, event_type),
         items_en = COALESCE($4, items_en), items_hi = COALESCE($5, items_hi),
         description_en = COALESCE($6, description_en), description_hi = COALESCE($7, description_hi),
         price = COALESCE($8, price),
         image_url = COALESCE($9, image_url),
         updated_at = NOW()
       WHERE id = $10 AND owner_id = $11 RETURNING *`,
      [
        name_en || null,
        name_hi || null,
        event_type || null,
        items_en || null,
        items_hi || null,
        description_en || null,
        description_hi || null,
        price || null,
        imageUrl,
        req.params.id,
        req.user.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package updated', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
});

// PATCH /api/admin/packages/:id/status  Body: { status: 'active' | 'inactive' } — soft delete
router.patch('/packages/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }
    const { rows } = await db.query(
      `UPDATE packages SET status = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: `Package marked as ${status}`, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update package status' });
  }
});

module.exports = router;
