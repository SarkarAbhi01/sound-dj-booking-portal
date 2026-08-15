import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  trackByToken,
  trackByBookingIdAndPhone,
  requestTrackingOtp,
  verifyTrackingOtp,
  submitBookingFeedback,
} from '../services/api';

function StatusTimeline({ booking, t }) {
  if (booking.status === 'cancelled') {
    return <p className="error-text">{t('tracking.status_cancelled_note')}</p>;
  }
  const deliveredDone = booking.delivery_status === 'delivered' || booking.status === 'completed';
  const completedDone = booking.status === 'completed';
  const steps = [
    { key: 'confirmed', done: true, label: t('tracking.step_confirmed') },
    { key: 'delivered', done: deliveredDone, label: t('tracking.step_delivered') },
    { key: 'completed', done: completedDone, label: t('tracking.step_completed') },
  ];
  return (
    <div className="tracking-timeline">
      {steps.map((s, i) => (
        <div key={s.key} className={`tracking-step ${s.done ? 'done' : ''}`}>
          <div className="tracking-dot">{s.done ? '✔' : i + 1}</div>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function BookingDetails({ booking, onFeedbackSent }) {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(booking.feedback_submitted);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSending(true);
    setError('');
    try {
      await submitBookingFeedback(booking.tracking_token, { message: feedback.trim(), rating });
      setSent(true);
      setFeedback('');
      onFeedbackSent?.();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="summary-box">
        <div className="summary-row"><span>{t('booking.booking_code')}</span><span>{booking.booking_code}</span></div>
        <div className="summary-row"><span>{t('booking.customer_name')}</span><span>{booking.customer_name}</span></div>
        <div className="summary-row"><span>{t('availability.select_date')}</span><span>{new Date(booking.event_date).toLocaleDateString('en-IN')}</span></div>
        <div className="summary-row"><span>{t('admin.event')}</span><span>{isHi ? booking.package_name_hi : booking.package_name_en}</span></div>
        <div className="summary-row"><span>{t('admin.sound_set')}</span><span>{isHi ? booking.sound_set_name_hi : booking.sound_set_name_en}</span></div>
        <div className="summary-row"><span>{t('tracking.vendor')}</span><span>{booking.vendor_name}</span></div>
        <div className="summary-row"><span>{t('booking.total_amount')}</span><span>₹{Number(booking.total_amount).toLocaleString('en-IN')}</span></div>
        <div className="summary-row"><span>{t('booking.advance_amount')}</span><span>₹{Number(booking.advance_amount).toLocaleString('en-IN')}</span></div>
        <div className="summary-row"><span>{t('booking.balance_amount')}</span><span>₹{Number(booking.balance_amount).toLocaleString('en-IN')}</span></div>
      </div>

      <h3>{t('tracking.status_heading')}</h3>
      <StatusTimeline booking={booking} t={t} />

      <div className="card" style={{ background: '#faf7ff', boxShadow: 'none', marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t('tracking.feedback_heading')}</h3>
        {sent ? (
          <p className="muted">{t('tracking.feedback_thanks')}</p>
        ) : (
          <form onSubmit={handleFeedbackSubmit}>
            <div className="form-row">
              <label>{t('tracking.rating')}</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{'⭐'.repeat(n)}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>{t('tracking.feedback_label')}</label>
              <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} required />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={sending}>
              {sending ? t('common.loading') : t('tracking.send_feedback')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TrackBookingPage() {
  const { t } = useTranslation();
  const { token } = useParams();

  const [mode, setMode] = useState('phone'); // 'phone' | 'otp'
  const [bookingCode, setBookingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    trackByToken(token)
      .then((res) => setBooking(res.data.data))
      .catch((err) => setError(err.response?.data?.message || t('tracking.not_found')))
      .finally(() => setLoading(false));
  }, [token, t]);

  const handlePhoneLookup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await trackByBookingIdAndPhone(bookingCode.trim(), phone.trim());
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('tracking.not_found'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestTrackingOtp(bookingCode.trim(), phone.trim());
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyTrackingOtp(bookingCode.trim(), otp.trim());
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (token) {
    return (
      <div className="card">
        <h2>{t('tracking.title')}</h2>
        {loading && <p>{t('common.loading')}</p>}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && booking && <BookingDetails booking={booking} />}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{t('tracking.title')}</h2>
      <p className="muted">{t('tracking.subtitle')}</p>

      {!booking && (
        <>
          <div className="event-type-pills">
            <button className={mode === 'phone' ? 'active' : ''} onClick={() => { setMode('phone'); setError(''); }}>
              {t('tracking.method_phone')}
            </button>
            <button className={mode === 'otp' ? 'active' : ''} onClick={() => { setMode('otp'); setError(''); }}>
              {t('tracking.method_otp')}
            </button>
          </div>

          {mode === 'phone' && (
            <form onSubmit={handlePhoneLookup}>
              <div className="grid cols-2">
                <div className="form-row">
                  <label>{t('booking.booking_code')} *</label>
                  <input value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label>{t('booking.customer_phone')} *</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn" type="submit" disabled={loading}>
                {loading ? t('common.loading') : t('tracking.check_status')}
              </button>
            </form>
          )}

          {mode === 'otp' && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp}>
              <div className="grid cols-2">
                <div className="form-row">
                  <label>{t('booking.booking_code')} *</label>
                  <input value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} required disabled={otpSent} />
                </div>
                <div className="form-row">
                  <label>{t('booking.customer_phone')} *</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={otpSent} />
                </div>
              </div>
              {otpSent && (
                <div className="form-row">
                  <label>{t('tracking.enter_otp')} *</label>
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
                </div>
              )}
              {error && <p className="error-text">{error}</p>}
              <button className="btn" type="submit" disabled={loading}>
                {loading ? t('common.loading') : otpSent ? t('tracking.verify_otp') : t('tracking.send_otp')}
              </button>
              {otpSent && (
                <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={handleRequestOtp} disabled={loading}>
                  {t('tracking.resend_otp')}
                </button>
              )}
            </form>
          )}
        </>
      )}

      {booking && (
        <>
          <BookingDetails booking={booking} />
          <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => { setBooking(null); setOtpSent(false); }}>
            {t('tracking.track_another')}
          </button>
        </>
      )}
    </div>
  );
}
