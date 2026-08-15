import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPackages } from '../services/api';

const EVENT_TYPES = ['wedding', 'birthday', 'bhagwat', 'jagran', 'orchestra', 'dj_night'];

export default function PackageSelector({ selectedPackage, onSelectPackage, initialEventType }) {
  const { t, i18n } = useTranslation();
  const [eventType, setEventType] = useState(initialEventType || 'wedding');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPackages(eventType)
      .then((res) => setPackages(res.data.data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [eventType]);

  const isHi = i18n.language === 'hi';

  return (
    <div className="card">
      <h2>{t('package.choose_package')}</h2>
      <p className="muted">{t('package.select_event')}</p>

      <div className="event-type-pills">
        {EVENT_TYPES.map((et) => (
          <button key={et} className={eventType === et ? 'active' : ''} onClick={() => setEventType(et)}>
            {t(`event_types.${et}`)}
          </button>
        ))}
      </div>

      {loading && <p>{t('common.loading')}</p>}

      <div className="grid cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
            onClick={() => onSelectPackage(pkg)}
          >
            <strong>{isHi ? pkg.name_hi : pkg.name_en}</strong>
            <div className="price">₹{Number(pkg.price).toLocaleString('en-IN')}</div>
            <div className="items">
              <strong>{t('package.items_included')}:</strong> {isHi ? pkg.items_hi : pkg.items_en}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
