import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BookingReceipt({ bookingResponse, onReset }) {
  const { t } = useTranslation();
  const booking = bookingResponse.data;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(booking.tracking_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the link is still visible/clickable below
    }
  };

  return (
    <div className="card receipt-box">
      <h2>{t('booking.success_title')}</h2>
      <p>{t('booking.booking_code')}</p>
      <p className="code">{booking.booking_code}</p>

      <div className="summary-box" style={{ textAlign: 'left' }}>
        <div className="summary-row">
          <span>{t('booking.customer_name')}</span>
          <span>{booking.customer_name}</span>
        </div>
        <div className="summary-row">
          <span>{t('availability.select_date')}</span>
          <span>{new Date(booking.event_date).toLocaleDateString('en-IN')}</span>
        </div>
        <div className="summary-row">
          <span>{t('booking.total_amount')}</span>
          <span>₹{Number(booking.total_amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-row">
          <span>{t('booking.advance_amount')}</span>
          <span>₹{Number(booking.advance_amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-row">
          <span>{t('booking.balance_amount')}</span>
          <span>₹{Number(booking.balance_amount).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {booking.tracking_url && (
        <div className="summary-box" style={{ textAlign: 'left' }}>
          <p style={{ marginTop: 0 }}><strong>{t('tracking.your_link_heading')}</strong></p>
          <p className="muted">{t('tracking.your_link_subtext')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to={`/track/${booking.tracking_token}`} style={{ wordBreak: 'break-all' }}>
              {booking.tracking_url}
            </Link>
            <button type="button" className="btn secondary" onClick={handleCopy}>
              {copied ? t('tracking.copied') : t('tracking.copy_link')}
            </button>
          </div>
        </div>
      )}

      <p className="muted">{t('booking.receipt_sent')}</p>
      <button className="btn" onClick={onReset}>{t('booking.book_another')}</button>
    </div>
  );
}
