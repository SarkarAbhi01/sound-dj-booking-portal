import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getMyBookingFields,
  createBookingField,
  updateBookingField,
  deleteBookingField,
  setBookingFieldStatus,
} from '../services/api';

const FIELD_TYPES = ['text', 'number', 'textarea', 'date', 'select', 'checkbox'];

const emptyForm = { label_en: '', label_hi: '', field_type: 'text', options: '', is_required: false, display_order: 0 };

export default function BookingFieldsManager() {
  const { t } = useTranslation();
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyBookingFields();
    setFields(res.data.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editingId) {
        await updateBookingField(editingId, form);
      } else {
        await createBookingField(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (f) => {
    setEditingId(f.id);
    setForm({
      label_en: f.label_en,
      label_hi: f.label_hi,
      field_type: f.field_type,
      options: f.options || '',
      is_required: f.is_required,
      display_order: f.display_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('fields.confirm_delete'))) return;
    setBusy(true);
    try {
      await deleteBookingField(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (f) => {
    setBusy(true);
    try {
      await setBookingFieldStatus(f.id, f.status === 'active' ? 'inactive' : 'active');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>{t('fields.title')}</h2>
          <p className="muted">{t('fields.subtitle')}</p>
        </div>
        <button className="btn" onClick={() => { resetForm(); setShowForm((s) => !s); }}>
          {showForm ? t('common.close') : `+ ${t('fields.add_field')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="grid cols-2">
            <div className="form-row">
              <label>{t('fields.label_en')} *</label>
              <input value={form.label_en} onChange={(e) => update('label_en', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('fields.label_hi')} *</label>
              <input value={form.label_hi} onChange={(e) => update('label_hi', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('fields.field_type')}</label>
              <select value={form.field_type} onChange={(e) => update('field_type', e.target.value)}>
                {FIELD_TYPES.map((ft) => (
                  <option key={ft} value={ft}>{t(`fields.type_${ft}`)}</option>
                ))}
              </select>
            </div>
            {form.field_type === 'select' && (
              <div className="form-row">
                <label>{t('fields.options')}</label>
                <input
                  value={form.options}
                  onChange={(e) => update('options', e.target.value)}
                  placeholder={t('fields.options_placeholder')}
                />
              </div>
            )}
            <div className="form-row">
              <label>{t('fields.display_order')}</label>
              <input type="number" value={form.display_order} onChange={(e) => update('display_order', e.target.value)} />
            </div>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(e) => update('is_required', e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                {t('fields.is_required')}
              </label>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn success" type="submit" disabled={busy}>
            {editingId ? t('common.submit') : t('fields.add_field')}
          </button>
        </form>
      )}

      <div className="table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>{t('fields.label_en')}</th>
              <th>{t('fields.label_hi')}</th>
              <th>{t('fields.field_type')}</th>
              <th>{t('fields.is_required')}</th>
              <th>{t('admin.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td>{f.label_en}</td>
                <td>{f.label_hi}</td>
                <td>{t(`fields.type_${f.field_type}`)}</td>
                <td>{f.is_required ? '✔️' : '—'}</td>
                <td>
                  <span className={`pill ${f.status === 'active' ? 'completed' : 'cancelled'}`}>
                    {f.status === 'active' ? t('superadmin.status_active') : t('inventory.status_inactive')}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn secondary" onClick={() => handleEdit(f)}>{t('common.edit')}</button>
                  <button className="btn secondary" disabled={busy} onClick={() => toggleStatus(f)}>
                    {f.status === 'active' ? t('fields.disable') : t('fields.enable')}
                  </button>
                  <button className="btn danger" disabled={busy} onClick={() => handleDelete(f.id)}>
                    {t('fields.remove')}
                  </button>
                </td>
              </tr>
            ))}
            {!fields.length && (
              <tr>
                <td colSpan={6} className="muted">{t('fields.no_fields')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
