import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function FloatingBookButton() {
  const { t } = useTranslation();
  const location = useLocation();

  const hideOn = ['/book', '/admin', '/superadmin', '/login'];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <Link to="/book" className="floating-book-btn">
      🔊 {t('nav.book_now')}
    </Link>
  );
}
