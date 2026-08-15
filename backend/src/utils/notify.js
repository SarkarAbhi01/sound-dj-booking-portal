/**
 * WhatsApp Notification Helper
 * ============================
 * By default this runs in "mock" mode and simply logs the message to the
 * console / returns it in the API response so the feature can be demoed
 * without a paid WhatsApp Business API subscription.
 *
 * To go live, set WHATSAPP_PROVIDER=twilio (or gupshup / meta) in .env and
 * fill in WHATSAPP_API_KEY / WHATSAPP_API_URL, then implement the relevant
 * branch below. Common providers:
 *   - Twilio WhatsApp API:      https://www.twilio.com/docs/whatsapp
 *   - Meta Cloud API:           https://developers.facebook.com/docs/whatsapp
 *   - Gupshup:                  https://www.gupshup.io/whatsapp-api
 */

async function dispatch(toPhone, message) {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';

  if (provider === 'mock') {
    console.log(`[MOCK WHATSAPP] -> ${toPhone}\n${message}\n`);
    return { sent: true, provider: 'mock', message };
  }

  // Example skeleton for a real provider integration:
  // const response = await fetch(process.env.WHATSAPP_API_URL, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}` },
  //   body: JSON.stringify({ to: toPhone, message }),
  // });
  // return await response.json();

  console.warn(`WhatsApp provider "${provider}" not implemented yet, falling back to mock.`);
  return { sent: true, provider: 'mock-fallback', message };
}

async function sendWhatsAppReceipt({ toPhone, customerName, bookingCode, amount, paymentType, trackingUrl }) {
  const message =
    `✅ Booking Receipt / बुकिंग रसीद\n` +
    `Booking ID: ${bookingCode}\n` +
    `Name / नाम: ${customerName}\n` +
    `Payment (${paymentType}): ₹${amount}\n` +
    (trackingUrl ? `\n📍 Track your booking / अपनी बुकिंग ट्रैक करें:\n${trackingUrl}\n` : '') +
    `\nThank you for booking with us! / बुकिंग के लिए धन्यवाद!`;

  return dispatch(toPhone, message);
}

/**
 * Sends a one-time password for the "Booking ID + OTP" tracking lookup.
 */
async function sendOtpMessage({ toPhone, bookingCode, otp }) {
  const message =
    `🔐 OTP for Booking ${bookingCode} / बुकिंग ${bookingCode} के लिए OTP\n` +
    `Your OTP / आपका OTP: ${otp}\n` +
    `Valid for 10 minutes / 10 मिनट के लिए मान्य। इसे किसी के साथ साझा न करें।`;

  return dispatch(toPhone, message);
}

module.exports = { sendWhatsAppReceipt, sendOtpMessage };