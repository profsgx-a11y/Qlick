/**
 * Greek public holidays for a given year — for the "add official holidays"
 * one-click preset in the closures editor.
 *
 * Returns a stable `id` per holiday (the human-readable name lives in the i18n
 * dictionaries under `dashboard.settings.holidayNames`, keyed by this id) and
 * the Gregorian `date` as "YYYY-MM-DD".
 *
 * Movable feasts key off Orthodox (Julian) Easter. The Julian→Gregorian offset
 * is fixed at 13 days, valid 1900-03-01 … 2100-02-28 — comfortably covers any
 * booking horizon.
 */

export interface GreekHoliday {
  id: string;
  date: string; // "YYYY-MM-DD"
}

/** Orthodox Easter Sunday (Gregorian date) via the Meeus Julian algorithm. */
function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1;
  // Julian date → Gregorian: +13 days for the 20th–21st centuries.
  const jd = new Date(Date.UTC(year, month - 1, day));
  jd.setUTCDate(jd.getUTCDate() + 13);
  return jd;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const fixed = (year: number, month: number, day: number) =>
  iso(new Date(Date.UTC(year, month - 1, day)));

/**
 * All Greek public holidays that fall within the given year, sorted by date.
 * Movable feasts are anchored to that year's Orthodox Easter.
 */
export function greekHolidays(year: number): GreekHoliday[] {
  const easter = orthodoxEaster(year);

  const list: GreekHoliday[] = [
    { id: "new_year", date: fixed(year, 1, 1) },
    { id: "epiphany", date: fixed(year, 1, 6) },
    { id: "clean_monday", date: iso(addDays(easter, -48)) },
    { id: "independence_day", date: fixed(year, 3, 25) },
    { id: "good_friday", date: iso(addDays(easter, -2)) },
    { id: "easter_sunday", date: iso(easter) },
    { id: "easter_monday", date: iso(addDays(easter, 1)) },
    { id: "labour_day", date: fixed(year, 5, 1) },
    { id: "holy_spirit", date: iso(addDays(easter, 50)) },
    { id: "assumption", date: fixed(year, 8, 15) },
    { id: "ohi_day", date: fixed(year, 10, 28) },
    { id: "christmas", date: fixed(year, 12, 25) },
    { id: "christmas_second", date: fixed(year, 12, 26) },
  ];

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
