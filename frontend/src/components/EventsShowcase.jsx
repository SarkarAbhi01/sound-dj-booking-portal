import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EVENTS = [
  { key: 'wedding', seed: 'wedding-sound-1', descKey: 'home.desc_wedding' },
  { key: 'dj_night', seed: 'dj-night-1', descKey: 'home.desc_dj_night' },
  { key: 'jagran', seed: 'jagran-1', descKey: 'home.desc_jagran' },
  { key: 'bhagwat', seed: 'bhagwat-1', descKey: 'home.desc_bhagwat' },
  { key: 'birthday', seed: 'birthday-1', descKey: 'home.desc_birthday' },
  { key: 'orchestra', seed: 'orchestra-1', descKey: 'home.desc_orchestra' },
];

export default function EventsShowcase() {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h2>{t('home.events_heading')}</h2>
      <p className="muted">{t('home.events_subheading')}</p>
      <div className="grid cols-3">
        {EVENTS.map((ev) => (
          <Link key={ev.key} to={`/book?type=${ev.key}`} className="event-showcase-card">
            <img src={`https://picsum.photos/seed/${ev.seed}/400/260`} alt={t(`event_types.${ev.key}`)} loading="lazy" />
            <div className="event-showcase-body">
              <strong>{t(`event_types.${ev.key}`)}</strong>
              <p className="muted">{t(ev.descKey)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
