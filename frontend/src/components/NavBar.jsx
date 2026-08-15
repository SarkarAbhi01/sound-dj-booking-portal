import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="top-nav">
      <Link to="/" className="brand">
        <strong>🔊 {t('app_title')}</strong>
        <span>{t('app_subtitle')}</span>
      </Link>
      <div className="nav-links">
        <Link to="/">{t('nav.home')}</Link>

        {isAuthenticated && user?.role === 'admin' && <Link to="/admin">{t('nav.admin')}</Link>}
        {isAuthenticated && user?.role === 'superadmin' && <Link to="/superadmin">{t('nav.superadmin')}</Link>}

        {isAuthenticated ? (
          <button onClick={handleLogout}>{t('auth.logout')}</button>
        ) : (
          <Link to="/login">{t('auth.login_button')}</Link>
        )}

        <LanguageSwitcher />
      </div>
    </nav>
  );
}
