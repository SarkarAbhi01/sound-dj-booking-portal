import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyEquipment, createEquipment, updateEquipment, setEquipmentStatus, INVOICE_BASE_URL } from '../services/api';

const emptyForm = { name_en: '', name_hi: '', description_en: '', description_hi: '', location: '' };

export default function EquipmentManager() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await getMyEquipment({ status: statusFilter || undefined, search: search || undefined });
    setItems(res.data.data);
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await updateEquipment(editingId, fd);
      } else {
        await createEquipment(fd);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name_en: item.name_en,
      name_hi: item.name_hi,
      description_en: item.description_en || '',
      description_hi: item.description_hi || '',
      location: item.location || '',
    });
    setShowForm(true);
  };

  const toggleStatus = async (item) => {
    setBusy(true);
    try {
      await setEquipmentStatus(item.id, item.status === 'active' ? 'inactive' : 'active');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2>{t('inventory.equipment_title')}</h2>
        <button className="btn" onClick={() => { resetForm(); setShowForm((s) => !s); }}>
          {showForm ? t('common.close') : `+ ${t('inventory.add_equipment')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="grid cols-2">
            <div className="form-row">
              <label>{t('inventory.name_en')} *</label>
              <input value={form.name_en} onChange={(e) => update('name_en', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('inventory.name_hi')} *</label>
              <input value={form.name_hi} onChange={(e) => update('name_hi', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('inventory.description_en')}</label>
              <input value={form.description_en} onChange={(e) => update('description_en', e.target.value)} />
            </div>
            <div className="form-row">
              <label>{t('inventory.description_hi')}</label>
              <input value={form.description_hi} onChange={(e) => update('description_hi', e.target.value)} />
            </div>
            <div className="form-row">
              <label>{t('inventory.location')}</label>
              <input value={form.location} onChange={(e) => update('location', e.target.value)} />
            </div>
            <div className="form-row">
              <label>{t('inventory.image_optional')}</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn success" type="submit" disabled={busy}>
            {editingId ? t('common.submit') : t('inventory.add_equipment')}
          </button>
        </form>
      )}

      <div className="grid cols-2" style={{ marginTop: 20, marginBottom: 6 }}>
        <div className="form-row">
          <label>{t('admin.status')}</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('superadmin.all_statuses')}</option>
            <option value="active">{t('superadmin.status_active')}</option>
            <option value="inactive">{t('inventory.status_inactive')}</option>
          </select>
        </div>
        <div className="form-row">
          <label>{t('superadmin.search_admins')}</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory.search_placeholder')} />
        </div>
      </div>

      <div className="grid cols-3">
        {items.map((item) => (
          <div key={item.id} className="package-card" style={{ cursor: 'default' }}>
            {item.image_url && (
              <img
                src={`${INVOICE_BASE_URL}${item.image_url}`}
                alt={item.name_en}
                style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }}
              />
            )}
            <strong>{isHi ? item.name_hi : item.name_en}</strong>
            <p className="items">{isHi ? item.description_hi : item.description_en}</p>
            <p className="muted">📍 {item.location}</p>
            <span className={`pill ${item.status === 'active' ? 'completed' : 'cancelled'}`}>
              {item.status === 'active' ? t('superadmin.status_active') : t('inventory.status_inactive')}
            </span>
            <div className="actions-cell" style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={() => handleEdit(item)}>{t('common.edit')}</button>
              <button className={`btn ${item.status === 'active' ? 'danger' : 'success'}`} disabled={busy} onClick={() => toggleStatus(item)}>
                {item.status === 'active' ? t('inventory.mark_inactive') : t('inventory.mark_active')}
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="muted">{t('inventory.no_items')}</p>}
      </div>
    </div>
  );
}
