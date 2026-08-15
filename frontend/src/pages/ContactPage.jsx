import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ContactPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Contact form is UI-only in this demo; wire it up to a backend endpoint
    // or email service (e.g. Nodemailer, Formspree) for production use.
    setSent(true);
  };

const phone = import.meta.env.VITE_CONTACT_PHONE || "+91-9876543210"; 
const email = import.meta.env.VITE_CONTACT_EMAIL || "support@sounddj.com";

  return (
    <div className="card">
      <h1>{t('footer.contact_us')}</h1>
      <p className="muted">{t('contact.subtitle')}</p>

      <div className="grid cols-2">
        <div className="summary-box">
          <div className="summary-row"><span>📞</span><span>{phone}</span></div>
          <div className="summary-row"><span>✉️</span><span>{email}</span></div>
          <div className="summary-row"><span>📍</span><span>{t('contact.address')}</span></div>
        </div>

        <form onSubmit={handleSubmit}>
          {sent ? (
            <p className="muted">{t('contact.thank_you')}</p>
          ) : (
            <>
              <div className="form-row">
                <label>{t('booking.customer_name')}</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="form-row">
                <label>{t('booking.customer_phone')}</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
              </div>
              <div className="form-row">
                <label>{t('contact.message')}</label>
                <textarea rows={4} value={form.message} onChange={(e) => update('message', e.target.value)} required />
              </div>
              <button className="btn" type="submit">{t('common.submit')}</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
