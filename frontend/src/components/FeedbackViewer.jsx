import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyFeedback } from '../services/api';

export default function FeedbackViewer() {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyFeedback()
      .then((res) => setFeedback(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <h2>{t('feedback.title')}</h2>
      <p className="muted">{t('feedback.subtitle')}</p>

      {loading && <p>{t('common.loading')}</p>}

      {!loading && !feedback.length && <p className="muted">{t('feedback.no_feedback')}</p>}

      <div className="grid cols-2">
        {feedback.map((f) => (
          <div key={f.id} className="package-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{f.customer_name}</strong>
              {f.rating && <span>{'⭐'.repeat(f.rating)}</span>}
            </div>
            <p className="muted">
              {t('booking.booking_code')}: {f.booking_code} · {f.customer_phone}
            </p>
            <p>{f.message}</p>
            <p className="muted">{new Date(f.created_at).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
