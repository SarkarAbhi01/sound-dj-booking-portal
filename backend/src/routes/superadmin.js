const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword } = require('../utils/password');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('superadmin'));

/**
 * POST /api/superadmin/admins
 * Creates a new admin (vendor) account.
 * Body: { name, email, phone, password }
 */
router.post('/admins', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES ($1,$2,$3,$4,'admin','active')
       RETURNING id, name, email, phone, role, status, created_at`,
      [name, email.toLowerCase().trim(), phone || null, passwordHash]
    );

    res.status(201).json({ success: true, message: 'Admin account created', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create admin account' });
  }
});

/**
 * GET /api/superadmin/admins?status=active&search=sharma
 * Lists all admin accounts with optional status filter and name/email search.
 */
router.get('/admins', async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [`role = 'admin'`];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
              COALESCE(rev.total_bookings, 0) AS total_bookings,
              COALESCE(rev.total_revenue, 0) AS total_revenue
       FROM users u
       LEFT JOIN (
         SELECT owner_id, COUNT(*) AS total_bookings,
                SUM(advance_amount) + SUM(balance_amount) AS total_revenue
         FROM bookings WHERE status != 'cancelled'
         GROUP BY owner_id
       ) rev ON rev.owner_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin accounts' });
  }
});

/**
 * PUT /api/superadmin/admins/:id
 * Edit admin name/email/phone.
 */
router.put('/admins/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
              phone = COALESCE($3, phone), updated_at = NOW()
       WHERE id = $4 AND role = 'admin'
       RETURNING id, name, email, phone, role, status`,
      [name || null, email ? email.toLowerCase().trim() : null, phone || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update admin' });
  }
});

/**
 * PATCH /api/superadmin/admins/:id/status
 * Body: { status: 'active' | 'suspended' | 'inactive' }
 */
router.patch('/admins/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active, suspended or inactive' });
    }
    const { rows } = await db.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND role = 'admin'
       RETURNING id, name, email, phone, role, status`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, message: `Admin account marked as ${status}`, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update admin status' });
  }
});

/**
 * GET /api/superadmin/revenue
 * Platform-wide revenue totals + per-admin breakdown.
 *
 * total_revenue = total_advance_received + total_balance_pending (always
 * holds true by construction — see admin.js summary route for the same
 * accounting approach). Cancelled bookings are excluded from all three and
 * reported separately so they're never mixed into revenue figures.
 */
router.get('/revenue', async (req, res) => {
  try {
    const totals = await db.query(`
      SELECT
        COALESCE(SUM(advance_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_advance_received,
        COALESCE(SUM(balance_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_balance_pending,
        COALESCE(SUM(advance_amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_advance_amount,
        COALESCE(SUM(balance_amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_balance_amount,
        COUNT(*) FILTER (WHERE status != 'cancelled') AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings
      FROM bookings
    `);
    const row = totals.rows[0];
    const totalAdvanceReceived = Number(row.total_advance_received);
    const totalBalancePending = Number(row.total_balance_pending);

    const byAdmin = await db.query(`
      SELECT u.id AS admin_id, u.name AS admin_name, u.email, u.status,
             COUNT(b.id) FILTER (WHERE b.status != 'cancelled') AS total_bookings,
             COALESCE(SUM(b.advance_amount) FILTER (WHERE b.status != 'cancelled'), 0) AS advance_received,
             COALESCE(SUM(b.balance_amount) FILTER (WHERE b.status != 'cancelled'), 0) AS balance_pending
      FROM users u
      LEFT JOIN bookings b ON b.owner_id = u.id
      WHERE u.role = 'admin'
      GROUP BY u.id, u.name, u.email, u.status
      ORDER BY u.name ASC
    `);
    const byAdminWithRevenue = byAdmin.rows
      .map((a) => ({
        ...a,
        total_revenue: Number(a.advance_received) + Number(a.balance_pending),
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    res.json({
      success: true,
      data: {
        ...row,
        total_advance_received: totalAdvanceReceived,
        total_balance_pending: totalBalancePending,
        total_revenue: totalAdvanceReceived + totalBalancePending,
        cancelled_total_amount: Number(row.cancelled_advance_amount) + Number(row.cancelled_balance_amount),
        by_admin: byAdminWithRevenue,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load revenue report' });
  }
});

module.exports = router;
