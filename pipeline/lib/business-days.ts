// Hong Kong business-day check for daily series (HIBOR etc.).
// Mon–Fri, excluding gazetted general holidays. Lists hardcoded 2026–2027
// (source: gov.hk "General Holidays" pages). Extend annually.

// weekday general holidays (Saturdays never gate since we require Mon–Fri)
const HK_HOLIDAYS = new Set<string>([
  // 2026
  '2026-01-01', // New Year's Day (Thu)
  '2026-02-17', // Lunar New Year's Day (Tue)
  '2026-02-18', // LNY 2nd day (Wed)
  '2026-02-19', // LNY 3rd day (Thu)
  '2026-04-03', // Good Friday (Fri)
  '2026-04-06', // day following Ching Ming / Easter Monday sub (Mon)
  '2026-04-07', // day following Easter Monday (Tue)
  '2026-05-01', // Labour Day (Fri)
  '2026-05-25', // day following Buddha's Birthday (Mon)
  '2026-06-19', // Tuen Ng Festival (Fri)
  '2026-07-01', // HKSAR Establishment Day (Wed)
  '2026-10-01', // National Day (Thu)
  '2026-10-19', // day following Chung Yeung (Mon)
  '2026-12-25', // Christmas Day (Fri)
  // 2027
  '2027-01-01', // New Year's Day (Fri)
  '2027-02-08', // LNY 3rd day (Mon)
  '2027-02-09', // LNY 4th day (Tue)
  '2027-03-26', // Good Friday (Fri)
  '2027-03-29', // Easter Monday (Mon)
  '2027-04-05', // Ching Ming Festival (Mon)
  '2027-05-13', // Buddha's Birthday (Thu)
  '2027-06-09', // Tuen Ng Festival (Wed)
  '2027-07-01', // HKSAR Establishment Day (Thu)
  '2027-09-16', // day following Mid-Autumn (Thu)
  '2027-10-01', // National Day (Fri)
  '2027-10-08', // Chung Yeung Festival (Fri)
  '2027-12-27', // first weekday after Christmas (Mon)
]);

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** true if `date` (local VM time) is a Hong Kong business day */
export function isHkBusinessDay(date: Date = new Date()): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !HK_HOLIDAYS.has(ymd(date));
}

/** next HK business day after `date` (inclusive of `date` when business day) */
export function nextHkBusinessDay(date: Date = new Date()): Date {
  const d = new Date(date.getTime());
  for (let i = 0; i < 10; i++) {
    if (isHkBusinessDay(d)) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}
