import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

  return (
    <div className="lang-toggle" role="group" aria-label="Language switcher">
      <button className={i18n.language === 'hi' ? 'active' : ''} onClick={() => changeLang('hi')}>
        हिंदी
      </button>
      <button className={i18n.language === 'en' ? 'active' : ''} onClick={() => changeLang('en')}>
        English
      </button>
    </div>
  );
}
