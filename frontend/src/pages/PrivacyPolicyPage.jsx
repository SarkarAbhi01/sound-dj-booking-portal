import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h1>{t('footer.privacy_policy')}</h1>
      <p className="muted">{t('privacy.last_updated')}</p>
      <h3>{t('privacy.h1')}</h3>
      <p>{t('privacy.p1')}</p>
      <h3>{t('privacy.h2')}</h3>
      <p>{t('privacy.p2')}</p>
      <h3>{t('privacy.h3')}</h3>
      <p>{t('privacy.p3')}</p>
      <h3>{t('privacy.h4')}</h3>
      <p>{t('privacy.p4')}</p>
    </div>
  );
}
