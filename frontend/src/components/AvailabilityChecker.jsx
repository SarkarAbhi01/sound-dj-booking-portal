import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAvailability } from '../services/api';
import { todayLocalYMD } from '../utils/dateHelpers';

export default function AvailabilityChecker({ selectedDate, onSelectDate, onSelectSoundSet, selectedSoundSet }) {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const isHi = i18n.language === 'hi';

  const handleCheck = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const res = await checkAvailability(selectedDate);
      setResult(res.data);
    } catch (err) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{t('availability.title')}</h2>
      <div className="form-row">
        <label>{t('availability.select_date')}</label>
        <input type="date" min={todayLocalYMD()} value={selectedDate} onChange={(e) => onSelectDate(e.target.value)} />
      </div>
      <button className="btn" onClick={handleCheck} disabled={!selectedDate || loading}>
        {loading ? t('common.loading') : t('availability.check_button')}
      </button>

      {result && (
        <>
          <p className={result.any_available ? 'muted' : 'error-text'} style={{ marginTop: 14 }}>
            {result.any_available ? t('availability.some_available') : t('availability.no_sets_available')}
          </p>
          <div className="availability-grid">
            {result.data.map((set) => (
              <div key={set.id} className={`availability-item ${set.is_available ? 'free' : 'taken'}`}>
                <strong>{isHi ? set.name_hi : set.name_en}</strong>
                <p className="muted">{isHi ? set.description_hi : set.description_en}</p>
                <p className={`status-tag ${set.is_available ? 'free' : 'taken'}`}>
                  {set.is_available ? t('availability.available') : t('availability.booked')}
                </p>
                {set.is_available && (
                  <button
                    className={`btn secondary ${selectedSoundSet?.id === set.id ? 'selected' : ''}`}
                    onClick={() => onSelectSoundSet(set)}
                  >
                    {selectedSoundSet?.id === set.id ? '✓ ' : ''}
                    {t('booking.select_sound_set')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
