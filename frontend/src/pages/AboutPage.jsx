import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h1>{t('footer.about_us')}</h1>
      <p>{t('about.p1')}</p>
      <p>{t('about.p2')}</p>
      <div className="grid cols-3" style={{ marginTop: 20 }}>
        <div className="stat-card">
          <div className="value">6+</div>
          <div className="label">{t('about.event_types')}</div>
        </div>
        <div className="stat-card">
          <div className="value">100%</div>
          <div className="label">{t('about.online_booking')}</div>
        </div>
        <div className="stat-card">
          <div className="value">🇮🇳</div>
          <div className="label">{t('about.hindi_english')}</div>
        </div>
      </div>
    </div>
  );
}
