import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAdminSummary,
  getSoundSetTracker,
  getBookings,
  getBooking,
  updateBooking,
  markDelivered,
  collectBalancePayment,
  cancelBooking,
  INVOICE_BASE_URL,
} from '../services/api';
import { todayLocalYMD, addDaysToYMD, formatYMDForDisplay } from '../utils/dateHelpers';
import EquipmentManager from './EquipmentManager';
import PackageManager from './PackageManager';
import BookingFieldsManager from './BookingFieldsManager';
import FeedbackViewer from './FeedbackViewer';

const EVENT_TYPES = ['wedding', 'birthday', 'bhagwat', 'jagran', 'orchestra', 'dj_night'];
const STATUSES = ['confirmed', 'completed', 'cancelled'];

// Admin can mark a booking delivered from 2 days before the event date up
// to 7 days after it — matches real-world setup/pickup windows.
const DELIVERY_WINDOW_DAYS_BEFORE = 2;
const DELIVERY_WINDOW_DAYS_AFTER = 7;

const emptyFilters = { event_type: '', status: '', date_from: '', date_to: '', phone: '' };
const emptyEditForm = { customer_name: '', customer_phone: '', customer_email: '', customer_address: '', event_location: '', event_date: '', notes: '' };

function deliveryWindowFor(eventDateYMD) {
  return {
    start: addDaysToYMD(eventDateYMD, -DELIVERY_WINDOW_DAYS_BEFORE),
    end: addDaysToYMD(eventDateYMD, DELIVERY_WINDOW_DAYS_AFTER),
  };
}

function BookingsTab() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  const [summary, setSummary] = useState(null);
  const [trackerDate, setTrackerDate] = useState(todayLocalYMD());
  const [tracker, setTracker] = useState([]);

  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState(emptyFilters);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [busyId, setBusyId] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);

  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const res = await getAdminSummary();
      setSummary(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadTracker = useCallback(async (date) => {
    try {
      const res = await getSoundSetTracker(date);
      setTracker(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadBookings = useCallback(async (filters) => {
    setLoadingBookings(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await getBookings(params);
      setBookings(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTracker(trackerDate);
  }, [trackerDate, loadTracker]);

  useEffect(() => {
    loadBookings(activeFilters);
  }, [activeFilters, loadBookings]);

  const refreshAll = async () => {
    await Promise.all([loadSummary(), loadTracker(trackerDate), loadBookings(activeFilters)]);
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setActiveFilters(filterDraft);
  };

  const handleResetFilters = () => {
    setFilterDraft(emptyFilters);
    setActiveFilters(emptyFilters);
  };

  const handleViewDetails = async (id) => {
    if (detailId === id) {
      setDetailId(null);
      setDetailData(null);
      return;
    }
    setEditId(null);
    setDetailId(id);
    setDetailData(null);
    try {
      const res = await getBooking(id);
      setDetailData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditStart = (b) => {
    setDetailId(null);
    if (editId === b.id) {
      setEditId(null);
      return;
    }
    setEditId(b.id);
    setEditError('');
    setEditForm({
      customer_name: b.customer_name || '',
      customer_phone: b.customer_phone || '',
      customer_email: b.customer_email || '',
      customer_address: b.customer_address || '',
      event_location: b.event_location || '',
      // b.event_date is already a plain 'YYYY-MM-DD' string from the backend —
      // bind it directly, no Date object round-trip (that was the source of
      // the "binds to one day before" bug).
      event_date: b.event_date,
      notes: b.notes || '',
    });
  };

  const handleEditSave = async (id) => {
    setBusyId(id);
    setEditError('');
    try {
      await updateBooking(id, editForm);
      setEditId(null);
      await refreshAll();
    } catch (err) {
      setEditError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelivered = async (id) => {
    debugger
    if (!window.confirm(t('admin.confirm_mark_delivered'))) return;
    setBusyId(id);
    try {
      await markDelivered(id, true);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCollectBalance = async (id) => {
    setBusyId(id);
    try {
      const res = await collectBalancePayment(id, { payment_mode: 'Cash' });
      setLastInvoice(res.data.data.invoice);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t('admin.confirm_cancel'))) return;
    setBusyId(id);
    try {
      await cancelBooking(id);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>{t('admin.title')}</h2>

        {summary && (
          <div className="stat-cards">
            <div className="stat-card">
              <div className="value">{summary.total_bookings}</div>
              <div className="label">{t('admin.total_bookings')}</div>
            </div>
            <div className="stat-card">
              <div className="value">{summary.upcoming_events}</div>
              <div className="label">{t('admin.upcoming_events')}</div>
            </div>
            <div className="stat-card">
              <div className="value">{summary.completed_events}</div>
              <div className="label">{t('admin.completed_events')}</div>
            </div>
            <div className="stat-card">
              <div className="value">{summary.cancelled_events}</div>
              <div className="label">{t('admin.cancelled_events')}</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{Number(summary.total_revenue).toLocaleString('en-IN')}</div>
              <div className="label">{t('superadmin.total_revenue')}</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{Number(summary.total_advance_received).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.total_advance_received')}</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{Number(summary.total_balance_pending).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.total_balance_pending')}</div>
            </div>
            <div className="stat-card cancelled-stat">
              <div className="value">₹{Number(summary.cancelled_total_amount).toLocaleString('en-IN')}</div>
              <div className="label">{t('admin.cancelled_bookings_value')}</div>
            </div>
          </div>
        )}
        <p className="muted" style={{ marginTop: -8 }}>
          {t('admin.revenue_formula_note')}
        </p>

        {lastInvoice && (
          <p className="muted">
            ✅ {lastInvoice.invoice_number} —{' '}
            <a href={`${INVOICE_BASE_URL}/${lastInvoice.pdf_path}`} target="_blank" rel="noreferrer">
              {t('admin.download_invoice')}
            </a>
          </p>
        )}

        <h3>{t('admin.filter_title')}</h3>
        <form onSubmit={handleApplyFilters}>
          <div className="grid cols-3">
            <div className="form-row">
              <label>{t('admin.filter_event_type')}</label>
              <select
                value={filterDraft.event_type}
                onChange={(e) => setFilterDraft((f) => ({ ...f, event_type: e.target.value }))}
              >
                <option value="">{t('admin.all_option')}</option>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>{t(`event_types.${et}`)}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>{t('admin.filter_status')}</label>
              <select
                value={filterDraft.status}
                onChange={(e) => setFilterDraft((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">{t('admin.all_option')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`admin.status_${s}`)}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>{t('superadmin.search_admins')}</label>
              <input
                value={filterDraft.phone}
                onChange={(e) => setFilterDraft((f) => ({ ...f, phone: e.target.value }))}
                placeholder={t('admin.search_placeholder')}
              />
            </div>
            <div className="form-row">
              <label>{t('admin.filter_date_from')}</label>
              <input
                type="date"
                value={filterDraft.date_from}
                onChange={(e) => setFilterDraft((f) => ({ ...f, date_from: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>{t('admin.filter_date_to')}</label>
              <input
                type="date"
                value={filterDraft.date_to}
                onChange={(e) => setFilterDraft((f) => ({ ...f, date_to: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="submit">{t('admin.apply_filters')}</button>
            <button type="button" className="btn secondary" onClick={handleResetFilters}>{t('admin.reset_filters')}</button>
          </div>
        </form>

        <h3 style={{ marginTop: 24 }}>{t('admin.upcoming_bookings_table')}</h3>
        {loadingBookings && <p>{t('common.loading')}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('admin.date')}</th>
                <th>{t('admin.customer')}</th>
                <th>{t('admin.phone')}</th>
                <th>{t('admin.event')}</th>
                <th>{t('admin.sound_set')}</th>
                <th>{t('admin.location')}</th>
                <th>{t('admin.advance')}</th>
                <th>{t('admin.balance')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.delivery_status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const win = deliveryWindowFor(b.event_date);
                const today = todayLocalYMD();
                const withinDeliveryWindow = today >= win.start && today <= win.end;
                const canMarkDelivered = b.delivery_status !== 'delivered' && b.status !== 'cancelled';

                return (
                <React.Fragment key={b.id}>
                  <tr>
                    <td>{formatYMDForDisplay(b.event_date)}</td>
                    <td>{b.customer_name}</td>
                    <td>{b.customer_phone}</td>
                    <td>{t(`event_types.${b.event_type}`, b.event_type)}</td>
                    <td>{isHi ? b.sound_set_name_hi : b.sound_set_name_en}</td>
                    <td>{b.location}</td>
                    <td>₹{Number(b.advance_amount).toLocaleString('en-IN')}</td>
                    <td>₹{Number(b.balance_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`pill ${b.status}`}>{t(`admin.status_${b.status}`, b.status)}</span></td>
                    <td><span className={`pill ${b.delivery_status}`}>{t(`admin.${b.delivery_status}`, b.delivery_status)}</span></td>
                    <td className="actions-cell">
                      <button className="btn secondary" onClick={() => handleViewDetails(b.id)}>
                        {detailId === b.id ? t('common.close') : t('admin.view_details')}
                      </button>
                      {canMarkDelivered && (
                        <button
                          className="btn secondary"
                          disabled={busyId === b.id || !withinDeliveryWindow}
                          title={withinDeliveryWindow ? '' : `${t('admin.delivery_window_hint')} ${formatYMDForDisplay(win.start)} – ${formatYMDForDisplay(win.end)}`}
                          onClick={() => handleDelivered(b.id)}
                        >
                          {t('admin.mark_delivered')}
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button className="btn secondary" onClick={() => handleEditStart(b)}>
                          {editId === b.id ? t('common.close') : t('admin.edit_booking')}
                        </button>
                      )}
                      {Number(b.balance_amount) > 0 && b.status !== 'cancelled' && (
                        <button className="btn success" disabled={busyId === b.id} onClick={() => handleCollectBalance(b.id)}>
                          {t('admin.collect_balance')}
                        </button>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button className="btn danger" disabled={busyId === b.id} onClick={() => handleCancel(b.id)}>
                          {t('admin.cancel_booking')}
                        </button>
                      )}
                      {b.invoice_pdf_path && (
                        <a className="btn secondary" href={`${INVOICE_BASE_URL}/${b.invoice_pdf_path}`} target="_blank" rel="noreferrer">
                          {t('admin.download_invoice')}
                        </a>
                      )}
                    </td>
                  </tr>

                  {canMarkDelivered && !withinDeliveryWindow && (
                    <tr>
                      <td colSpan={11} style={{ paddingTop: 0 }}>
                        <p className="muted" style={{ margin: '0 0 8px' }}>
                          ⏰ {t('admin.delivery_window_hint')} {formatYMDForDisplay(win.start)} – {formatYMDForDisplay(win.end)}
                        </p>
                      </td>
                    </tr>
                  )}

                  {detailId === b.id && (
                    <tr>
                      <td colSpan={11}>
                        {!detailData ? (
                          <p className="muted">{t('common.loading')}</p>
                        ) : (
                          <div className="summary-box" style={{ margin: '8px 0' }}>
                            <div className="summary-row"><span>{t('auth.email')}</span><span>{detailData.customer_email || '—'}</span></div>
                            <div className="summary-row"><span>{t('booking.customer_address')}</span><span>{detailData.customer_address || '—'}</span></div>
                            <div className="summary-row"><span>{t('booking.event_location')}</span><span>{detailData.event_location || '—'}</span></div>
                            {detailData.custom_fields?.length > 0 ? (
                              detailData.custom_fields.map((f) => (
                                <div className="summary-row" key={f.field_key}>
                                  <span>{isHi ? f.label_hi : f.label_en}</span>
                                  <span>{f.value}</span>
                                </div>
                              ))
                            ) : (
                              <p className="muted">{t('fields.no_fields')}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}

                  {editId === b.id && (
                    <tr>
                      <td colSpan={11}>
                        <div className="summary-box" style={{ margin: '8px 0', textAlign: 'left' }}>
                          <h4 style={{ marginTop: 0 }}>{t('admin.edit_booking')}</h4>
                          <div className="grid cols-2">
                            <div className="form-row">
                              <label>{t('booking.customer_name')}</label>
                              <input value={editForm.customer_name} onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))} />
                            </div>
                            <div className="form-row">
                              <label>{t('booking.customer_phone')}</label>
                              <input value={editForm.customer_phone} onChange={(e) => setEditForm((f) => ({ ...f, customer_phone: e.target.value }))} />
                            </div>
                            <div className="form-row">
                              <label>{t('booking.customer_email')}</label>
                              <input type="email" value={editForm.customer_email} onChange={(e) => setEditForm((f) => ({ ...f, customer_email: e.target.value }))} />
                            </div>
                            <div className="form-row">
                              <label>{t('admin.event_date')}</label>
                              <input type="date" value={editForm.event_date} min={todayLocalYMD()} onChange={(e) => setEditForm((f) => ({ ...f, event_date: e.target.value }))} />
                            </div>
                            <div className="form-row">
                              <label>{t('booking.event_location')}</label>
                              <input value={editForm.event_location} onChange={(e) => setEditForm((f) => ({ ...f, event_location: e.target.value }))} />
                            </div>
                            <div className="form-row">
                              <label>{t('booking.customer_address')}</label>
                              <input value={editForm.customer_address} onChange={(e) => setEditForm((f) => ({ ...f, customer_address: e.target.value }))} />
                            </div>
                          </div>
                          {editError && <p className="error-text">{editError}</p>}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button className="btn success" disabled={busyId === b.id} onClick={() => handleEditSave(b.id)}>
                              {t('admin.save_changes')}
                            </button>
                            <button className="btn secondary" onClick={() => setEditId(null)}>{t('common.cancel')}</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );})}
              {!loadingBookings && !bookings.length && (
                <tr>
                  <td colSpan={11} className="muted">{t('admin.no_results')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>{t('admin.sound_set_tracker')}</h2>
        <div className="form-row" style={{ maxWidth: 260 }}>
          <label>{t('admin.select_date_tracker')}</label>
          <input type="date" value={trackerDate} onChange={(e) => setTrackerDate(e.target.value)} />
        </div>
        {tracker.length === 0 ? (
          <p className="muted">{t('admin.no_bookings')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('admin.sound_set')}</th>
                  <th>{t('admin.location')}</th>
                  <th>{t('admin.customer')}</th>
                  <th>{t('admin.event')}</th>
                  <th>{t('admin.status')}</th>
                  <th>{t('admin.delivery_status')}</th>
                </tr>
              </thead>
              <tbody>
                {tracker.map((row) => (
                  <tr key={row.booking_code}>
                    <td>{isHi ? row.sound_set_name_hi : row.sound_set_name_en}</td>
                    <td>{row.location}</td>
                    <td>{row.customer_name} ({row.customer_phone})</td>
                    <td>{t(`event_types.${row.event_type}`, row.event_type)}</td>
                    <td><span className={`pill ${row.status}`}>{t(`admin.status_${row.status}`, row.status)}</span></td>
                    <td><span className={`pill ${row.delivery_status}`}>{t(`admin.${row.delivery_status}`, row.delivery_status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('bookings');

  return (
    <div>
      <div className="event-type-pills" style={{ marginBottom: 4 }}>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>
          {t('admin.tab_bookings')}
        </button>
        <button className={tab === 'equipment' ? 'active' : ''} onClick={() => setTab('equipment')}>
          {t('inventory.equipment_title')}
        </button>
        <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>
          {t('inventory.packages_title')}
        </button>
        <button className={tab === 'fields' ? 'active' : ''} onClick={() => setTab('fields')}>
          {t('fields.title')}
        </button>
        <button className={tab === 'feedback' ? 'active' : ''} onClick={() => setTab('feedback')}>
          {t('feedback.title')}
        </button>
      </div>

      {tab === 'bookings' && <BookingsTab />}
      {tab === 'equipment' && <EquipmentManager />}
      {tab === 'packages' && <PackageManager />}
      {tab === 'fields' && <BookingFieldsManager />}
      {tab === 'feedback' && <FeedbackViewer />}
    </div>
  );
}
