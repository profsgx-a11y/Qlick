/**
 * Pure mapping logic for the Google Calendar sync — no HTTP, no Supabase,
 * so the node test suite can exercise it directly.
 */

import { zonedTimeToUtc } from "@/lib/availability";
import type { GcalEvent, GcalEventInput } from "./calendar";

/** How far ahead we mirror busy events / offer the one-time import. */
export const BUSY_WINDOW_DAYS = 90;

export interface SyncableBooking {
  id: string;
  business_id: string;
  staff_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  service_name: string | null;
  gcal_event_id: string | null;
  gcal_connection_id: string | null;
}

export interface ConnectionLite {
  id: string;
  staff_id: string | null;
  calendar_id: string;
  push_enabled: boolean;
}

/**
 * Which connection should hold this booking's event?
 * - Booking assigned to a staff member → that member's calendar.
 * - Unassigned booking → the business-wide connection if one exists,
 *   otherwise — when the business has exactly one connection — that one
 *   (covers solo shops where "any staff" bookings are common).
 */
export function pickConnectionForBooking<T extends ConnectionLite>(
  booking: Pick<SyncableBooking, "staff_id">,
  connections: T[],
): T | null {
  const enabled = connections.filter((c) => c.push_enabled);
  if (booking.staff_id) {
    return enabled.find((c) => c.staff_id === booking.staff_id) ?? null;
  }
  return (
    enabled.find((c) => c.staff_id === null) ??
    (enabled.length === 1 ? enabled[0] : null)
  );
}

/** Active bookings own a slot; only these are pushed / kept in Google. */
export function bookingBlocksTime(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

/**
 * The Google event for a booking. Label-free description so it reads fine
 * in any language; the qlickBookingId extended property is the anti-loop
 * marker (busy sync skips events carrying it).
 */
export function bookingEventBody(
  booking: SyncableBooking,
  timeZone: string,
): GcalEventInput {
  const title =
    [booking.customer_name, booking.service_name].filter(Boolean).join(" — ") ||
    "Qlick";
  const description = [
    booking.customer_phone,
    booking.customer_notes,
    "Qlick · https://qlick.gr",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: title,
    description,
    start: { dateTime: booking.starts_at, timeZone },
    end: { dateTime: booking.ends_at, timeZone },
    extendedProperties: {
      private: {
        qlickBookingId: booking.id,
        qlickBusinessId: booking.business_id,
      },
    },
    reminders: { useDefault: true },
  };
}

export interface BusyInterval {
  gcal_event_id: string;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
}

/**
 * Google events → busy intervals worth blocking in Qlick.
 * Skips: cancelled events, events marked "Free" (transparent — Google's
 * default for all-day events), events Qlick itself created (anti-loop),
 * and events already adopted as bookings (one-time import).
 * All-day events are anchored to the business timezone.
 */
export function busyIntervalsFromEvents(
  events: GcalEvent[],
  timeZone: string,
  excludeEventIds: ReadonlySet<string>,
): BusyInterval[] {
  const out: BusyInterval[] = [];
  for (const e of events) {
    if (!e.id || e.status === "cancelled") continue;
    if (e.transparency === "transparent") continue;
    if (e.extendedProperties?.private?.qlickBookingId) continue;
    if (excludeEventIds.has(e.id)) continue;

    if (e.start?.dateTime && e.end?.dateTime) {
      const starts = new Date(e.start.dateTime);
      const ends = new Date(e.end.dateTime);
      if (!(ends > starts)) continue;
      out.push({
        gcal_event_id: e.id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_all_day: false,
      });
    } else if (e.start?.date && e.end?.date) {
      const starts = dateAtMidnight(e.start.date, timeZone);
      const ends = dateAtMidnight(e.end.date, timeZone); // end date is exclusive
      if (!starts || !ends || !(ends > starts)) continue;
      out.push({
        gcal_event_id: e.id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_all_day: true,
      });
    }
  }
  return out;
}

function dateAtMidnight(dateStr: string, timeZone: string): Date | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return zonedTimeToUtc(y, m, d, 0, 0, timeZone);
}

export interface ImportableEvent {
  gcalEventId: string;
  summary: string;
  startsAtIso: string;
  endsAtIso: string;
  durationMinutes: number;
}

/**
 * Google events eligible for the one-time import: timed (not all-day),
 * not cancelled, not created by Qlick, not already imported. Titles are
 * shown in the preview so the owner recognizes their appointments.
 */
export function importableEventsFrom(
  events: GcalEvent[],
  excludeEventIds: ReadonlySet<string>,
): ImportableEvent[] {
  const out: ImportableEvent[] = [];
  for (const e of events) {
    if (!e.id || e.status === "cancelled") continue;
    if (e.extendedProperties?.private?.qlickBookingId) continue;
    if (excludeEventIds.has(e.id)) continue;
    if (!e.start?.dateTime || !e.end?.dateTime) continue;
    const starts = new Date(e.start.dateTime);
    const ends = new Date(e.end.dateTime);
    if (!(ends > starts)) continue;
    out.push({
      gcalEventId: e.id,
      summary: e.summary?.trim() || "",
      startsAtIso: starts.toISOString(),
      endsAtIso: ends.toISOString(),
      durationMinutes: Math.round((ends.getTime() - starts.getTime()) / 60_000),
    });
  }
  return out;
}
