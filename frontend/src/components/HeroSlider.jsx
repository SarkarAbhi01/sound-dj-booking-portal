import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const SLIDES = [
  { key: 'wedding', gradient: 'linear-gradient(135deg, #7b2ff7, #f107a3)', emoji: '💍' },
  { key: 'dj_night', gradient: 'linear-gradient(135deg, #ff6b35, #7b2ff7)', emoji: '🎧' },
  { key: 'jagran', gradient: 'linear-gradient(135deg, #ff9d00, #ff6b35)', emoji: '🪔' },
  { key: 'orchestra', gradient: 'linear-gradient(135deg, #1fa964, #7b2ff7)', emoji: '🎻' },
];

export default function HeroSlider() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-slider">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.key}
          className={`hero-slide ${i === active ? 'active' : ''}`}
          style={{ background: slide.gradient }}
        >
          <div className="hero-slide-emoji">{slide.emoji}</div>
          <h1>{t('app_title')}</h1>
          <p>{t(`event_types.${slide.key}`)} · {t('app_subtitle')}</p>
          <Link to="/book" className="btn hero-cta">{t('nav.book_now')}</Link>
        </div>
      ))}
      <div className="hero-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            className={i === active ? 'active' : ''}
            onClick={() => setActive(i)}
            aria-label={`slide-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
