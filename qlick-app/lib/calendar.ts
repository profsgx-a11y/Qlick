/**
 * Calendar grid math — pure helpers for the dashboard day/week calendar.
 *
 * Times come from the DB as UTC ISO strings (timestamptz). The grid is laid
 * out in the business timezone, so we convert instants to "minutes from
 * midnight" in that zone. Reuses the tz helpers from the availability engine.
 */

import {
  zonedTimeToUtc,
  formatInZone,
  dayOfWeekInZone,
  type DayHours,
  type Closure,
} from "./availability";

/** Vertical scale of the grid. */
export const HOUR_HEIGHT = 100; // px per hour
export const PX_PER_MIN = HOUR_HEIGHT / 60;
/** Snap granularity for drag/resize (later phases). */
export const SNAP_MIN = 15;
/** No top gap: the grid starts flush under the header so every hour cell is the
    same height and there's no stray gradient line above the opening hour.
    (Hour labels are top-aligned, so the first one still isn't clipped.) */
export const TOP_PAD = 0;

export interface CalBooking {
  id: string;
  startsAt: string; // UTC ISO
  endsAt: string; // UTC ISO
  staffId: string | null;
  status: string;
  serviceId: string | null;
  serviceName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerNotes: string | null; // free-text comment the customer left when booking
  noStaffPreference: boolean; // customer didn't request a specific person
  color: string | null; // service color (fallback handled by UI)
}

export interface CalStaff {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
}

export interface OpenInterval {
  startMin: number;
  endMin: number;
}

export interface DayWindow {
  startMin: number; // grid top (rounded down to the hour)
  endMin: number; // grid bottom (rounded up to the hour)
  open: OpenInterval[]; // business-open intervals that day
  isClosed: boolean; // fully closed that day
}

/** Parse "HH:MM[:SS]" to minutes from midnight. */
function hm(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from midnight (in `tz`) for a UTC ISO instant. */
export function minutesFromMidnight(iso: string, tz: string): number {
  const [h, m] = formatInZone(new Date(iso), tz).split(":").map(Number);
  return h * 60 + m;
}

/** Today's date as YYYY-MM-DD in a timezone. */
export function todayInZone(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA yields YYYY-MM-DD
}

/** Shift a YYYY-MM-DD date string by `n` days (calendar-safe, tz-agnostic). */
export function addDaysStr(date: string, n: number): string {
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** The Monday (YYYY-MM-DD) of the week containing `date`. */
export function startOfWeekStr(date: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const dow = dt.getUTCDay(); // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow; // back to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

/** The 7 day-strings (Mon→Sun) of the week containing `date`. */
export function weekDays(date: string): string[] {
  const start = startOfWeekStr(date);
  return Array.from({ length: 7 }, (_, i) => addDaysStr(start, i));
}

/** 7 day-strings starting from `date` (rolling week: today + next 6). */
export function rollingWeekDays(date: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(date, i));
}

/** First day (YYYY-MM-01) of the month containing `date`. */
export function startOfMonthStr(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Shift a date string by `n` months, landing on day 01. */
export function addMonthsStr(date: string, n: number): string {
  const [y, mo] = date.split("-").map(Number);
  const total = y * 12 + (mo - 1) + n;
  const ny = Math.floor(total / 12);
  const nmo = (total % 12) + 1;
  return `${ny}-${String(nmo).padStart(2, "0")}-01`;
}

/** 42 day-strings (6 weeks, Mon→Sun) covering the month grid of `date`. */
export function monthGridDays(date: string): string[] {
  const gridStart = startOfWeekStr(startOfMonthStr(date));
  return Array.from({ length: 42 }, (_, i) => addDaysStr(gridStart, i));
}

/** Local date (YYYY-MM-DD) in `tz` for a UTC ISO instant. */
export function localDateInZone(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** UTC range [start, end) covering a full local day in `tz`. */
export function dayRangeUtc(date: string, tz: string): { from: Date; to: Date } {
  const [y, mo, d] = date.split("-").map(Number);
  const from = zonedTimeToUtc(y, mo, d, 0, 0, tz);
  const next = addDaysStr(date, 1);
  const [ny, nmo, nd] = next.split("-").map(Number);
  const to = zonedTimeToUtc(ny, nmo, nd, 0, 0, tz);
  return { from, to };
}

/** Determine the visible window + open intervals for a single day. */
export function buildDayWindow(
  date: string,
  tz: string,
  hours: DayHours[],
  closures: Closure[],
  bookings: CalBooking[],
): DayWindow {
  const dow = dayOfWeekInZone(date, tz);
  const closure = closures.find((c) => c.date === date);

  let open: OpenInterval[] = [];
  let isClosed = false;

  if (closure) {
    if (closure.is_closed) {
      isClosed = true;
    } else if (closure.special_open_time && closure.special_close_time) {
      open = [
        {
          startMin: hm(closure.special_open_time),
          endMin: hm(closure.special_close_time),
        },
      ];
    }
  }

  if (open.length === 0 && !isClosed) {
    open = hours
      .filter(
        (h) =>
          h.day_of_week === dow && !h.is_closed && h.open_time && h.close_time,
      )
      .map((h) => ({ startMin: hm(h.open_time!), endMin: hm(h.close_time!) }))
      .sort((a, b) => a.startMin - b.startMin);
    if (open.length === 0) isClosed = true;
  }

  // Grid bounds cover the open intervals plus any bookings; fallback 09–21.
  let lo = Infinity;
  let hi = -Infinity;
  for (const o of open) {
    lo = Math.min(lo, o.startMin);
    hi = Math.max(hi, o.endMin);
  }
  for (const b of bookings) {
    lo = Math.min(lo, minutesFromMidnight(b.startsAt, tz));
    hi = Math.max(hi, minutesFromMidnight(b.endsAt, tz));
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) {
    lo = 9 * 60;
    hi = 21 * 60;
  }

  return {
    startMin: Math.floor(lo / 60) * 60,
    endMin: Math.ceil(hi / 60) * 60,
    open,
    isClosed,
  };
}

/** Closed segments = complement of open intervals within the grid window. */
export function closedSegments(win: DayWindow): OpenInterval[] {
  if (win.isClosed) return [{ startMin: win.startMin, endMin: win.endMin }];
  const segs: OpenInterval[] = [];
  let cursor = win.startMin;
  for (const o of [...win.open].sort((a, b) => a.startMin - b.startMin)) {
    if (o.startMin > cursor) segs.push({ startMin: cursor, endMin: o.startMin });
    cursor = Math.max(cursor, o.endMin);
  }
  if (cursor < win.endMin) segs.push({ startMin: cursor, endMin: win.endMin });
  return segs;
}

export interface LaidOutBooking extends CalBooking {
  startMin: number;
  endMin: number;
  topPx: number;
  heightPx: number;
  lane: number;
  lanes: number;
}

/**
 * Lay out one column's bookings, splitting overlapping ones into side-by-side
 * lanes (greedy interval graph coloring within overlap clusters).
 */
export function layoutColumn(
  bookings: CalBooking[],
  windowStartMin: number,
  tz: string,
): LaidOutBooking[] {
  const items = bookings
    .map((b) => {
      const s = minutesFromMidnight(b.startsAt, tz);
      let e = minutesFromMidnight(b.endsAt, tz);
      if (e <= s) e = s + SNAP_MIN; // guard against zero/negative spans
      return { b, s, e };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const result: LaidOutBooking[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanesEnd: number[] = [];
    const laneOf: number[] = [];
    for (const it of cluster) {
      let placed = -1;
      for (let i = 0; i < lanesEnd.length; i++) {
        if (lanesEnd[i] <= it.s) {
          placed = i;
          lanesEnd[i] = it.e;
          break;
        }
      }
      if (placed === -1) {
        placed = lanesEnd.length;
        lanesEnd.push(it.e);
      }
      laneOf.push(placed);
    }
    const lanes = lanesEnd.length;
    cluster.forEach((it, i) => {
      result.push({
        ...it.b,
        startMin: it.s,
        endMin: it.e,
        topPx: (it.s - windowStartMin) * PX_PER_MIN,
        heightPx: Math.max((it.e - it.s) * PX_PER_MIN, 20),
        lane: laneOf[i],
        lanes,
      });
    });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const it of items) {
    if (cluster.length === 0 || it.s < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.e);
    } else {
      flush();
      cluster.push(it);
      clusterEnd = it.e;
    }
  }
  flush();
  return result;
}

/** Hour marks (minutes) from window start to end inclusive. */
export function hourMarks(win: DayWindow): number[] {
  const marks: number[] = [];
  for (let m = win.startMin; m <= win.endMin; m += 60) marks.push(m);
  return marks;
}

/**
 * True if [startMin, endMin] fits entirely within one open interval of the day.
 * Used to reject walk-in / drag / resize that would run past closing time.
 */
export function isWithinOpenHours(
  startMin: number,
  endMin: number,
  win: DayWindow,
): boolean {
  if (win.isClosed) return false;
  return win.open.some(
    (o) => startMin >= o.startMin && endMin <= o.endMin,
  );
}

/** "HH:MM" label for a minutes-from-midnight value. */
export function minLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
