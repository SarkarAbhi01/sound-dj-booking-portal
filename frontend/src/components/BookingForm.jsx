import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBooking, generateUpiQr, getPackageBookingFields } from '../services/api';

export default function BookingForm({ selectedPackage, selectedSoundSet, selectedDate, onBookingComplete }) {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    event_location: '',
    advance_percent: 20,
    gst_required: false,
    payment_mode: 'UPI',
    transaction_id: '',
  });
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [qr, setQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = selectedPackage ? Number(selectedPackage.price) : 0;
  const advanceAmount = Math.round((totalAmount * form.advance_percent) / 100);
  const balanceAmount = totalAmount - advanceAmount;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateCustom = (key, value) => setCustomValues((f) => ({ ...f, [key]: value }));

  // Vendor-specific extra fields depend on which package the customer picked
  useEffect(() => {
    if (!selectedPackage) {
      setCustomFields([]);
      setCustomValues({});
      return;
    }
    getPackageBookingFields(selectedPackage.id)
      .then((res) => {
        setCustomFields(res.data.data);
        setCustomValues({});
      })
      .catch(() => setCustomFields([]));
  }, [selectedPackage]);

  const handleGenerateQr = async () => {
    try {
      const res = await generateUpiQr(advanceAmount, `Advance for ${selectedPackage?.name_en || 'booking'}`);
      setQr(res.data.data.qr_code);
    } catch (err) {
      setError(t('common.error_generic'));
    }
  };

  const canSubmit =
    selectedPackage && selectedSoundSet && selectedDate && form.customer_name && form.customer_phone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setError(t('common.required_field'));
      return;
    }
    const missing = customFields.filter((f) => f.is_required && !String(customValues[f.field_key] || '').trim());
    if (missing.length) {
      setError(`${t('common.required_field')}: ${missing.map((f) => (isHi ? f.label_hi : f.label_en)).join(', ')}`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await createBooking({
        ...form,
        event_type: selectedPackage.event_type,
        event_date: selectedDate,
        package_id: selectedPackage.id,
        sound_set_id: selectedSoundSet.id,
        custom_fields: customValues,
      });
      onBookingComplete(res.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomField = (f) => {
    //const label = isHi ? f.label_hi : f.label_en;
    const value = customValues[f.field_key] || '';
    if (f.field_type === 'textarea') {
      return <textarea rows={2} value={value} onChange={(e) => updateCustom(f.field_key, e.target.value)} />;
    }
    if (f.field_type === 'select') {
      const opts = (f.options || '').split(',').map((o) => o.trim()).filter(Boolean);
      return (
        <select value={value} onChange={(e) => updateCustom(f.field_key, e.target.value)}>
          <option value="">--</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (f.field_type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => updateCustom(f.field_key, e.target.checked ? 'true' : 'false')}
        />
      );
    }
    return (
      <input
        type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => updateCustom(f.field_key, e.target.value)}
      />
    );
  };

  return (
    <div className="card">
      <h2>{t('booking.title')}</h2>

      {!selectedPackage || !selectedSoundSet || !selectedDate ? (
        <p className="muted">↑ {t('common.required_field')}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid cols-2">
            <div className="form-row">
              <label>{t('booking.customer_name')} *</label>
              <input value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('booking.customer_phone')} *</label>
              <input value={form.customer_phone} onChange={(e) => update('customer_phone', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('booking.customer_email')}</label>
              <input type="email" value={form.customer_email} onChange={(e) => update('customer_email', e.target.value)} />
            </div>
            <div className="form-row">
              <label>{t('booking.event_location')}</label>
              <input value={form.event_location} onChange={(e) => update('event_location', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label>{t('booking.customer_address')}</label>
            <textarea rows={2} value={form.customer_address} onChange={(e) => update('customer_address', e.target.value)} />
          </div>

          {customFields.length > 0 && (
            <div className="card" style={{ background: '#faf7ff', boxShadow: 'none' }}>
              <h3 style={{ marginTop: 0 }}>{t('fields.vendor_needs')}</h3>
              <div className="grid cols-2">
                {customFields.map((f) => (
                  <div className="form-row" key={f.field_key}>
                    <label>
                      {isHi ? f.label_hi : f.label_en} {f.is_required && '*'}
                    </label>
                    {renderCustomField(f)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="summary-box">
            <div className="summary-row">
              <span>{t('booking.total_amount')}</span>
              <span>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <label>{t('booking.advance_percent')}</label>
              <select value={form.advance_percent} onChange={(e) => update('advance_percent', Number(e.target.value))}>
                <option value={20}>20%</option>
                <option value={50}>50%</option>
              </select>
            </div>
            <div className="summary-row">
              <span>{t('booking.advance_amount')}</span>
              <span>₹{advanceAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-row">
              <span>{t('booking.balance_amount')}</span>
              <span>₹{balanceAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={form.gst_required}
                onChange={(e) => update('gst_required', e.target.checked)}
                style={{ marginRight: 6 }}
              />
              {t('booking.gst_required')}
            </label>
          </div>

          <div className="form-row">
            <label>{t('booking.payment_mode')}</label>
            <select value={form.payment_mode} onChange={(e) => update('payment_mode', e.target.value)}>
              {['UPI', 'QR', 'PhonePe', 'GooglePay', 'Cash', 'BankTransfer'].map((m) => (
                <option key={m} value={m}>
                  {t(`payment_modes.${m}`)}
                </option>
              ))}
            </select>
          </div>

          {['UPI', 'QR', 'PhonePe', 'GooglePay'].includes(form.payment_mode) && (
            <div className="form-row">
              <button type="button" className="btn secondary" onClick={handleGenerateQr}>
                {t('booking.generate_qr')}
              </button>
              {qr && (
                <div className="qr-box">
                  <p>{t('booking.scan_to_pay')} ₹{advanceAmount.toLocaleString('en-IN')}</p>
                  <img src={qr} alt="UPI QR Code" />
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <label>{t('booking.transaction_id')}</label>
            <input value={form.transaction_id} onChange={(e) => update('transaction_id', e.target.value)} />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn success" type="submit" disabled={!canSubmit || submitting}>
            {submitting ? t('common.loading') : t('booking.confirm_booking')}
          </button>
        </form>
      )}
    </div>
  );
}
