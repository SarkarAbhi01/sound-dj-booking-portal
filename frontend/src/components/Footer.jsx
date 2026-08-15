import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer-rich">
      <div className="footer-grid">
        <div className="footer-col">
          <strong>🔊 {t('app_title')}</strong>
          <p className="muted">{t('app_subtitle')}</p>
        </div>

        <div className="footer-col">
          <h4>{t('footer.quick_links')}</h4>
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/book">{t('nav.book_now')}</Link>
          <Link to="/track">{t('tracking.title')}</Link>
        </div>

        <div className="footer-col">
          <h4>{t('footer.company')}</h4>
          <Link to="/about">{t('footer.about_us')}</Link>
          <Link to="/contact">{t('footer.contact_us')}</Link>
          <Link to="/privacy-policy">{t('footer.privacy_policy')}</Link>
        </div>

        <div className="footer-col">
          <h4>{t('footer.account')}</h4>
          <Link to="/login">{t('footer.admin_login')}</Link>
        </div>
      </div>

      <div className="footer-bottom">
        © {year} {t('app_title')}. {t('footer.rights_reserved')}
      </div>
    </footer>
  );
}
