import { zonedTimeToUtc, dayOfWeekInZone } from "@/lib/availability";

/**
 * Recurrence patterns for repeating appointments.
 *  - weekly:          every `intervalN` weeks on `weekday` (0=Sun..6=Sat)
 *  - monthly_dom:     every `intervalN` months on day-of-month `dayOfMonth`
 *  - monthly_nth_dow: every `intervalN` months on the `nth` `weekday`
 *                     (nth = 1..5, or -1 for "last")
 */
export type PatternType = "weekly" | "monthly_dom" | "monthly_nth_dow";

export interface RecurrenceRule {
  patternType: PatternType;
  intervalN: number;
  weekday?: number | null;
  nth?: number | null;
  dayOfMonth?: number | null;
  timeOfDay: string; // "HH:MM"
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function parseDate(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = parseDate(dateStr);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** The date (YYYY-MM-DD) of the nth `weekday` in month y/m, or null if absent. */
function nthWeekdayOfMonth(
  y: number,
  m: number,
  weekday: number,
  nth: number,
  tz: string,
): string | null {
  const dim = daysInMonth(y, m);
  if (nth === -1) {
    for (let d = dim; d >= 1; d--) {
      if (dayOfWeekInZone(ymd(y, m, d), tz) === weekday) return ymd(y, m, d);
    }
    return null;
  }
  let count = 0;
  for (let d = 1; d <= dim; d++) {
    if (dayOfWeekInZone(ymd(y, m, d), tz) === weekday) {
      count += 1;
      if (count === nth) return ymd(y, m, d);
    }
  }
  return null;
}

/**
 * Returns up to `count` occurrence dates (YYYY-MM-DD, business timezone),
 * on or after `startDate`, following the rule. Months where the target day
 * doesn't exist (e.g. the 31st, or a 5th Monday) are skipped, never shifted.
 */
export function computeOccurrenceDates(
  rule: RecurrenceRule,
  startDate: string,
  count: number,
  tz: string,
): string[] {
  const out: string[] = [];
  const interval = Math.max(1, rule.intervalN);

  if (rule.patternType === "weekly") {
    const wd = rule.weekday ?? 0;
    let d = startDate;
    // advance to the first matching weekday on/after startDate
    for (let g = 0; g < 7 && dayOfWeekInZone(d, tz) !== wd; g++) d = addDays(d, 1);
    for (let i = 0; i < count; i++) {
      out.push(d);
      d = addDays(d, 7 * interval);
    }
    return out;
  }

  // Monthly patterns: step month-by-interval from the start month.
  let [y, m] = parseDate(startDate);
  let guard = 0;
  const maxGuard = count * interval + 36; // safety against absent-day skips
  while (out.length < count && guard < maxGuard) {
    let cand: string | null = null;
    if (rule.patternType === "monthly_dom") {
      const dom = rule.dayOfMonth ?? 1;
      if (dom <= daysInMonth(y, m)) cand = ymd(y, m, dom);
    } else {
      cand = nthWeekdayOfMonth(y, m, rule.weekday ?? 0, rule.nth ?? 1, tz);
    }
    if (cand && cand >= startDate) out.push(cand);
    // advance by `interval` months
    m += interval;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    guard += 1;
  }
  return out;
}

/** Combines an occurrence date + "HH:MM" into a UTC ISO instant for `tz`. */
export function occurrenceStartIso(
  dateStr: string,
  timeOfDay: string,
  tz: string,
): string {
  const [y, m, d] = parseDate(dateStr);
  const [h, min] = timeOfDay.split(":").map(Number);
  return zonedTimeToUtc(y, m, d, h, min, tz).toISOString();
}
