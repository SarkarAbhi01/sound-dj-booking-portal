import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createAdminAccount,
  getAdminAccounts,
  updateAdminAccount,
  setAdminStatus,
  getPlatformRevenue,
} from '../services/api';

const emptyForm = { name: '', email: '', phone: '', password: '' };

export default function SuperadminDashboard() {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAdmins = useCallback(async () => {
    const res = await getAdminAccounts({ status: statusFilter || undefined, search: search || undefined });
    setAdmins(res.data.data);
  }, [statusFilter, search]);

  const loadRevenue = useCallback(async () => {
    const res = await getPlatformRevenue();
    setRevenue(res.data.data);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editingId) {
        await updateAdminAccount(editingId, { name: form.name, email: form.email, phone: form.phone });
      } else {
        await createAdminAccount(form);
      }
      resetForm();
      await loadAdmins();
      await loadRevenue();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (admin) => {
    setEditingId(admin.id);
    setForm({ name: admin.name, email: admin.email, phone: admin.phone || '', password: '' });
  };

  const handleStatusChange = async (id, status) => {
    setBusy(true);
    try {
      await setAdminStatus(id, status);
      await loadAdmins();
      await loadRevenue();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>{t('superadmin.title')}</h2>

        {revenue && (
          <div className="stat-cards">
            <div className="stat-card">
              <div className="value">₹{Number(revenue.total_revenue).toLocaleString('en-IN')}</div>
              <div className="label">{t('superadmin.total_revenue')}</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{Number(revenue.total_advance_received).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.total_advance_received')}</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{Number(revenue.total_balance_pending).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.total_balance_pending')}</div>
            </div>
            <div className="stat-card">
              <div className="value">{revenue.total_bookings}</div>
              <div className="label">{t('admin.total_bookings')}</div>
            </div>
            <div className="stat-card">
              <div className="value">{admins.length}</div>
              <div className="label">{t('superadmin.total_admins')}</div>
            </div>
            <div className="stat-card cancelled-stat">
              <div className="value">₹{Number(revenue.cancelled_total_amount).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.cancelled_bookings_value')}</div>
            </div>
          </div>
        )}
        <p className="muted" style={{ marginTop: -8 }}>{t('admin.revenue_formula_note')}</p>
      </div>

      <div className="card">
        <h3>{editingId ? t('superadmin.edit_admin') : t('superadmin.create_admin')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid cols-2">
            <div className="form-row">
              <label>{t('superadmin.admin_name')} *</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('auth.email')} *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('superadmin.admin_phone')}</label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            {!editingId && (
              <div className="form-row">
                <label>{t('auth.password')} *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={busy}>
              {editingId ? t('common.submit') : t('superadmin.create_admin')}
            </button>
            {editingId && (
              <button type="button" className="btn secondary" onClick={resetForm}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>{t('superadmin.manage_admins')}</h3>
        <div className="grid cols-2" style={{ marginBottom: 12 }}>
          <div className="form-row">
            <label>{t('admin.status')}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t('superadmin.all_statuses')}</option>
              <option value="active">{t('superadmin.status_active')}</option>
              <option value="suspended">{t('superadmin.status_suspended')}</option>
              <option value="inactive">{t('superadmin.status_inactive')}</option>
            </select>
          </div>
          <div className="form-row">
            <label>{t('superadmin.search_admins')}</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('superadmin.search_placeholder')} />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('superadmin.admin_name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('superadmin.admin_phone')}</th>
                <th>{t('admin.total_bookings')}</th>
                <th>{t('superadmin.total_revenue')}</th>
                <th>{t('admin.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{a.total_bookings}</td>
                  <td>₹{Number(a.total_revenue).toLocaleString('en-IN')}</td>
                  <td><span className={`pill ${a.status === 'active' ? 'completed' : a.status === 'suspended' ? 'cancelled' : 'pending_advance'}`}>{t(`superadmin.status_${a.status}`)}</span></td>
                  <td className="actions-cell">
                    <button className="btn secondary" onClick={() => handleEdit(a)}>{t('common.edit')}</button>
                    {a.status !== 'active' && (
                      <button className="btn success" disabled={busy} onClick={() => handleStatusChange(a.id, 'active')}>
                        {t('superadmin.activate')}
                      </button>
                    )}
                    {a.status !== 'suspended' && (
                      <button className="btn danger" disabled={busy} onClick={() => handleStatusChange(a.id, 'suspended')}>
                        {t('superadmin.suspend')}
                      </button>
                    )}
                    {a.status !== 'inactive' && (
                      <button className="btn secondary" disabled={busy} onClick={() => handleStatusChange(a.id, 'inactive')}>
                        {t('superadmin.deactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!admins.length && (
                <tr>
                  <td colSpan={7} className="muted">{t('admin.no_bookings')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
