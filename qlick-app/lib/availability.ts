/**
 * Availability engine — pure functions to compute bookable time slots.
 *
 * Business hours are stored as wall-clock times for a given timezone
 * (default Europe/Athens). We convert those to absolute UTC instants so
 * bookings (stored as timestamptz) line up correctly across DST.
 */

export interface DayHours {
  day_of_week: number; // 0 = Sunday
  is_closed: boolean;
  open_time: string | null; // "HH:MM[:SS]"
  close_time: string | null;
}

export interface Closure {
  date: string; // "YYYY-MM-DD"
  is_closed: boolean;
  special_open_time: string | null;
  special_close_time: string | null;
}

export interface BusyInterval {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface Slot {
  iso: string; // UTC ISO start time
  label: string; // "HH:MM" in business timezone
}

const DEFAULT_SLOT_INTERVAL = 15;

/** Offset (ms) of a timezone relative to UTC at a given instant. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(at);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  return asUtc - at.getTime();
}

/** Convert a wall-clock time in `timeZone` to the matching UTC Date. */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

/** Wall-clock "HH:MM" of a UTC instant rendered in `timeZone`. */
export function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseHM(t: string): { h: number; m: number } {
  const [h, m] = t.split(":");
  return { h: Number(h), m: Number(m) };
}

/** Day of week (0=Sun) for a YYYY-MM-DD date in a timezone. */
export function dayOfWeekInZone(dateStr: string, timeZone: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  // noon avoids DST edge issues for determining the weekday
  const utc = zonedTimeToUtc(y, mo, d, 12, 0, timeZone);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(utc);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[
    wd as "Sun"
  ];
}

export interface ComputeSlotsParams {
  date: string; // YYYY-MM-DD (business timezone)
  timeZone: string;
  hours: DayHours[];
  closures: Closure[];
  busy: BusyInterval[];
  durationMinutes: number;
  slotIntervalMinutes?: number;
  now?: Date;
}

/**
 * Returns the bookable start slots for a single day.
 */
export function computeAvailableSlots(params: ComputeSlotsParams): Slot[] {
  const {
    date,
    timeZone,
    hours,
    closures,
    busy,
    durationMinutes,
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL,
    now = new Date(),
  } = params;

  const [year, month, day] = date.split("-").map(Number);
  const dow = dayOfWeekInZone(date, timeZone);

  // Determine open/close windows for this date
  const closure = closures.find((c) => c.date === date);
  let windows: Array<{ open: string; close: string }> = [];

  if (closure) {
    if (closure.is_closed) return [];
    if (closure.special_open_time && closure.special_close_time) {
      windows = [
        { open: closure.special_open_time, close: closure.special_close_time },
      ];
    }
  }

  if (windows.length === 0) {
    windows = hours
      .filter((h) => h.day_of_week === dow && !h.is_closed && h.open_time && h.close_time)
      .map((h) => ({ open: h.open_time!, close: h.close_time! }));
  }

  if (windows.length === 0) return [];

  const busyRanges = busy.map((b) => ({
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }));

  const durationMs = durationMinutes * 60_000;
  const stepMs = slotIntervalMinutes * 60_000;
  const slots: Slot[] = [];

  for (const w of windows) {
    const { h: oh, m: om } = parseHM(w.open);
    const { h: ch, m: cm } = parseHM(w.close);
    const openUtc = zonedTimeToUtc(year, month, day, oh, om, timeZone).getTime();
    const closeUtc = zonedTimeToUtc(year, month, day, ch, cm, timeZone).getTime();

    for (let t = openUtc; t + durationMs <= closeUtc; t += stepMs) {
      const slotStart = t;
      const slotEnd = t + durationMs;

      // Must be in the future
      if (slotStart <= now.getTime()) continue;

      // Must not overlap a busy range
      const overlaps = busyRanges.some(
        (b) => slotStart < b.end && slotEnd > b.start,
      );
      if (overlaps) continue;

      slots.push({
        iso: new Date(slotStart).toISOString(),
        label: formatInZone(new Date(slotStart), timeZone),
      });
    }
  }

  return slots;
}

export interface StaffBusy {
  staffId: string | null;
  startsAt: string;
  endsAt: string;
}

export interface ComputeStaffSlotsParams {
  date: string;
  timeZone: string;
  hours: DayHours[];
  closures: Closure[];
  durationMinutes: number;
  slotIntervalMinutes?: number;
  now?: Date;
  staffBusy: StaffBusy[];
  capableStaffIds: string[]; // bookable staff who can do the service
  selectedStaffId: string | null; // null = any available
  // Per-staff custom weekly hours; staff not listed here inherit business hours.
  staffHours?: Record<string, Record<number, { open: string; close: string }[]>>;
  customStaffIds?: string[]; // staff that have a custom weekly schedule
}

/**
 * Staff-aware bookable slots for a single day.
 * - A specific staff: slots where that staff has no overlapping booking.
 * - "Any" (null): slots where at least one capable staff is free, after
 *   accounting for unassigned bookings that also consume capacity.
 */
export function computeStaffAwareSlots(params: ComputeStaffSlotsParams): Slot[] {
  const {
    date,
    timeZone,
    hours,
    closures,
    durationMinutes,
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL,
    now = new Date(),
    staffBusy,
    capableStaffIds,
    selectedStaffId,
    staffHours = {},
    customStaffIds = [],
  } = params;

  const [year, month, day] = date.split("-").map(Number);
  const dow = dayOfWeekInZone(date, timeZone);

  const closure = closures.find((c) => c.date === date);
  let windows: Array<{ open: string; close: string }> = [];
  if (closure) {
    if (closure.is_closed) return [];
    if (closure.special_open_time && closure.special_close_time) {
      windows = [
        { open: closure.special_open_time, close: closure.special_close_time },
      ];
    }
  }
  if (windows.length === 0) {
    windows = hours
      .filter(
        (h) =>
          h.day_of_week === dow && !h.is_closed && h.open_time && h.close_time,
      )
      .map((h) => ({ open: h.open_time!, close: h.close_time! }));
  }
  if (windows.length === 0) return [];

  const ranges = staffBusy.map((b) => ({
    staffId: b.staffId,
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }));

  // Per-staff working ranges (UTC) for this day; staff with a custom schedule
  // only work inside their windows, others inherit the business hours.
  const customSet = new Set(customStaffIds);
  const staffRanges: Record<string, Array<{ start: number; end: number }>> = {};
  for (const id of capableStaffIds) {
    if (!customSet.has(id)) continue;
    staffRanges[id] = (staffHours[id]?.[dow] ?? []).map((w) => {
      const o = parseHM(w.open);
      const c = parseHM(w.close);
      return {
        start: zonedTimeToUtc(year, month, day, o.h, o.m, timeZone).getTime(),
        end: zonedTimeToUtc(year, month, day, c.h, c.m, timeZone).getTime(),
      };
    });
  }
  const worksAt = (id: string, s: number, e: number) => {
    const r = staffRanges[id];
    if (!r) return true; // inherits business hours
    return r.some((w) => s >= w.start && e <= w.end);
  };

  const durationMs = durationMinutes * 60_000;
  const stepMs = slotIntervalMinutes * 60_000;
  const slots: Slot[] = [];

  for (const w of windows) {
    const { h: oh, m: om } = parseHM(w.open);
    const { h: ch, m: cm } = parseHM(w.close);
    const openUtc = zonedTimeToUtc(year, month, day, oh, om, timeZone).getTime();
    const closeUtc = zonedTimeToUtc(year, month, day, ch, cm, timeZone).getTime();

    for (let t = openUtc; t + durationMs <= closeUtc; t += stepMs) {
      const slotStart = t;
      const slotEnd = t + durationMs;
      if (slotStart <= now.getTime()) continue;

      const overlap = (r: { start: number; end: number }) =>
        slotStart < r.end && slotEnd > r.start;

      let available: boolean;
      if (selectedStaffId) {
        const sFree =
          worksAt(selectedStaffId, slotStart, slotEnd) &&
          !ranges.some((r) => r.staffId === selectedStaffId && overlap(r));
        if (!sFree) {
          available = false;
        } else {
          // Assigning this staff must still leave enough free capable staff for
          // any unassigned bookings overlapping the slot, else it overbooks.
          const freeOthers = capableStaffIds.filter(
            (id) =>
              id !== selectedStaffId &&
              worksAt(id, slotStart, slotEnd) &&
              !ranges.some((r) => r.staffId === id && overlap(r)),
          ).length;
          const unassigned = ranges.filter(
            (r) => r.staffId === null && overlap(r),
          ).length;
          available = freeOthers >= unassigned;
        }
      } else if (capableStaffIds.length === 0) {
        // No online staff configured → business-level single-slot guard.
        available = !ranges.some(overlap);
      } else {
        const freeCapable = capableStaffIds.filter(
          (id) =>
            worksAt(id, slotStart, slotEnd) &&
            !ranges.some((r) => r.staffId === id && overlap(r)),
        ).length;
        const unassigned = ranges.filter(
          (r) => r.staffId === null && overlap(r),
        ).length;
        available = freeCapable - unassigned >= 1;
      }
      if (!available) continue;

      slots.push({
        iso: new Date(slotStart).toISOString(),
        label: formatInZone(new Date(slotStart), timeZone),
      });
    }
  }

  return slots;
}
