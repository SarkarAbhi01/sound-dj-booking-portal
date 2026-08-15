/**
 * Generates a short human-friendly booking code e.g. BK-20260731-4F2A
 */
function generateBookingCode() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${y}${m}${d}-${rand}`;
}

/**
 * Generates an invoice number e.g. INV-2026-000123
 */
function generateInvoiceNumber(sequence) {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(6, '0');
  return `INV-${year}-${seq}`;
}

module.exports = { generateBookingCode, generateInvoiceNumber };
