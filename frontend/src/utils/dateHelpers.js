/**
 * Timezone-safe date helpers.
 *
 * IMPORTANT: never use `new Date().toISOString().slice(0, 10)` to get
 * "today" or to bind a date into an <input type="date">. toISOString()
 * converts to UTC first, which can silently shift the calendar day
 * backwards or forwards depending on the user's local timezone (this was
 * the cause of the "edit date binds to one day before" bug). These helpers
 * always work in the browser's local calendar day instead.
 */

/** Today's date as a local 'YYYY-MM-DD' string. */
export function todayLocalYMD() {
  return toLocalYMD(new Date());
}

/** Formats any Date / date-string / date-only string as local 'YYYY-MM-DD'. */
export function toLocalYMD(dateInput) {
  if (!dateInput) return '';
  // Plain 'YYYY-MM-DD' strings (e.g. from the backend, which now sends
  // event_date pre-formatted) need no conversion at all — return as-is.
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds (or subtracts, for negative values) whole days to a 'YYYY-MM-DD' string. */
export function addDaysToYMD(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalYMD(dt);
}

/** Formats a 'YYYY-MM-DD' string for display, e.g. '15 Aug 2026'. */
export function formatYMDForDisplay(ymd, locale = 'en-IN') {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}
