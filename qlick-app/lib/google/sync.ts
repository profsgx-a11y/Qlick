import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "./crypto";
import {
  deleteEvent,
  gcalConfigured,
  GoogleApiError,
  insertEvent,
  listCalendars,
  listEventsWindow,
  patchEvent,
  refreshAccessToken,
  revokeToken,
} from "./calendar";
import {
  BUSY_WINDOW_DAYS,
  bookingBlocksTime,
  bookingEventBody,
  busyIntervalsFromEvents,
  importableEventsFrom,
  pickConnectionForBooking,
  type ImportableEvent,
  type SyncableBooking,
} from "./mapping";

type Admin = ReturnType<typeof createAdminClient>;

export const CONNECTION_COLS =
  "id, business_id, staff_id, google_email, calendar_id, calendar_summary, push_enabled, busy_enabled, busy_synced_at, sync_error, created_at";

const CONNECTION_COLS_SECRET = `${CONNECTION_COLS}, refresh_token_enc, access_token_enc, access_token_expires_at`;

const BOOKING_COLS =
  "id, business_id, staff_id, status, starts_at, ends_at, customer_name, customer_phone, customer_notes, service_name, gcal_event_id, gcal_connection_id";

interface ConnectionSecretRow {
  id: string;
  business_id: string;
  staff_id: string | null;
  google_email: string;
  calendar_id: string;
  calendar_summary: string | null;
  push_enabled: boolean;
  busy_enabled: boolean;
  busy_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
}

/**
 * Valid access token for a connection — decrypts the cached one when still
 * fresh, otherwise refreshes and stores it. Returns null (and marks the
 * connection) when Google rejected the refresh token (user revoked access).
 */
async function accessTokenFor(
  admin: Admin,
  conn: ConnectionSecretRow,
  cache: Map<string, string | null>,
): Promise<string | null> {
  if (cache.has(conn.id)) return cache.get(conn.id) ?? null;

  let token: string | null = null;
  if (
    conn.access_token_enc &&
    conn.access_token_expires_at &&
    new Date(conn.access_token_expires_at) > new Date()
  ) {
    try {
      token = decryptToken(conn.access_token_enc);
    } catch {
      token = null; // key rotated — fall through to refresh
    }
  }

  if (!token) {
    try {
      const fresh = await refreshAccessToken(decryptToken(conn.refresh_token_enc));
      token = fresh.accessToken;
      await admin
        .from("calendar_connections")
        .update({
          access_token_enc: encryptToken(fresh.accessToken),
          access_token_expires_at: fresh.accessTokenExpiresAt,
          sync_error: null,
        })
        .eq("id", conn.id);
    } catch (e) {
      if (e instanceof GoogleApiError && e.code === "invalid_grant") {
        await admin
          .from("calendar_connections")
          .update({ sync_error: "reconnect_required" })
          .eq("id", conn.id);
      }
      token = null;
    }
  }

  cache.set(conn.id, token);
  return token;
}

async function inPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await fn(item);
      }
    }),
  );
}

export interface SyncCounts {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: number;
}

/**
 * Mirror the given bookings to Google Calendar (create/patch/delete as
 * needed). Resilient: per-booking failures are logged and counted, never
 * thrown. Call via queueGcalSync() from server actions.
 */
export async function syncBookingsToGoogle(
  bookingIds: string[],
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };
  const ids = [...new Set(bookingIds)].filter(Boolean);
  if (ids.length === 0 || !gcalConfigured()) return counts;

  const admin = createAdminClient();

  // Load bookings in chunks (imports can queue hundreds).
  const bookings: SyncableBooking[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await admin
      .from("bookings")
      .select(BOOKING_COLS)
      .in("id", ids.slice(i, i + 200));
    if (error) {
      console.error("[gcal] failed to load bookings", error.message);
      counts.failed += ids.length;
      return counts;
    }
    bookings.push(...((data ?? []) as SyncableBooking[]));
  }
  if (bookings.length === 0) return counts;

  const businessIds = [...new Set(bookings.map((b) => b.business_id))];
  const [{ data: connRows }, { data: bizRows }] = await Promise.all([
    admin
      .from("calendar_connections")
      .select(CONNECTION_COLS_SECRET)
      .in("business_id", businessIds),
    admin.from("businesses").select("id, timezone").in("id", businessIds),
  ]);
  const connections = (connRows ?? []) as ConnectionSecretRow[];
  if (connections.length === 0) return counts;

  const tzByBusiness = new Map(
    (bizRows ?? []).map((b) => [b.id, b.timezone || "Europe/Athens"]),
  );
  const connById = new Map(connections.map((c) => [c.id, c]));
  const connsByBusiness = new Map<string, ConnectionSecretRow[]>();
  for (const c of connections) {
    const list = connsByBusiness.get(c.business_id) ?? [];
    list.push(c);
    connsByBusiness.set(c.business_id, list);
  }

  const tokenCache = new Map<string, string | null>();

  await inPool(bookings, 4, async (booking) => {
    try {
      const bizConns = connsByBusiness.get(booking.business_id) ?? [];
      if (bizConns.length === 0) {
        counts.skipped++;
        return;
      }
      const timeZone = tzByBusiness.get(booking.business_id) ?? "Europe/Athens";
      const old = booking.gcal_connection_id
        ? (connById.get(booking.gcal_connection_id) ?? null)
        : null;
      const target = pickConnectionForBooking(booking, bizConns);
      const shouldCreate =
        target !== null &&
        bookingBlocksTime(booking.status) &&
        new Date(booking.ends_at) > new Date();

      if (booking.gcal_event_id) {
        // Cancelled → remove the event from Google (the calendar always
        // shows real availability; restoring re-creates it).
        if (booking.status === "cancelled") {
          const holder = old ?? target;
          if (!holder) {
            counts.skipped++;
            return;
          }
          const token = await accessTokenFor(admin, holder, tokenCache);
          if (!token) {
            counts.failed++;
            return;
          }
          await deleteEvent(token, holder.calendar_id, booking.gcal_event_id);
          await admin
            .from("bookings")
            .update({
              gcal_event_id: null,
              gcal_connection_id: null,
              gcal_synced_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
          counts.deleted++;
          return;
        }

        // Staff moved to another connected calendar → move the event.
        if (target && old && target.id !== old.id) {
          const oldToken = await accessTokenFor(admin, old, tokenCache);
          if (oldToken) {
            await deleteEvent(oldToken, old.calendar_id, booking.gcal_event_id);
          }
          const token = await accessTokenFor(admin, target, tokenCache);
          if (!token) {
            counts.failed++;
            return;
          }
          const created = await insertEvent(
            token,
            target.calendar_id,
            bookingEventBody(booking, timeZone),
          );
          await admin
            .from("bookings")
            .update({
              gcal_event_id: created.id,
              gcal_connection_id: target.id,
              gcal_synced_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
          counts.updated++;
          return;
        }

        if (!target) {
          counts.skipped++; // push disabled / staff unmapped — leave event be
          return;
        }

        // Same (or adopted) connection → patch in place; if the owner
        // deleted the event by hand, fall back to re-creating it.
        const token = await accessTokenFor(admin, target, tokenCache);
        if (!token) {
          counts.failed++;
          return;
        }
        try {
          await patchEvent(
            token,
            target.calendar_id,
            booking.gcal_event_id,
            bookingEventBody(booking, timeZone),
          );
          await admin
            .from("bookings")
            .update({
              gcal_connection_id: target.id,
              gcal_synced_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
          counts.updated++;
        } catch (e) {
          if (
            e instanceof GoogleApiError &&
            (e.status === 404 || e.status === 410) &&
            shouldCreate
          ) {
            const created = await insertEvent(
              token,
              target.calendar_id,
              bookingEventBody(booking, timeZone),
            );
            await admin
              .from("bookings")
              .update({
                gcal_event_id: created.id,
                gcal_connection_id: target.id,
                gcal_synced_at: new Date().toISOString(),
              })
              .eq("id", booking.id);
            counts.created++;
          } else {
            throw e;
          }
        }
        return;
      }

      // No event yet.
      if (!shouldCreate || !target) {
        counts.skipped++;
        return;
      }
      const token = await accessTokenFor(admin, target, tokenCache);
      if (!token) {
        counts.failed++;
        return;
      }
      const created = await insertEvent(
        token,
        target.calendar_id,
        bookingEventBody(booking, timeZone),
      );
      await admin
        .from("bookings")
        .update({
          gcal_event_id: created.id,
          gcal_connection_id: target.id,
          gcal_synced_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      counts.created++;
    } catch (e) {
      counts.failed++;
      console.error(
        "[gcal] push failed for booking",
        booking.id,
        e instanceof Error ? e.message : e,
      );
    }
  });

  return counts;
}

/**
 * Fire-and-forget mirror of bookings to Google after the response is sent.
 * Safe to call unconditionally from any server action that touches
 * bookings — exits instantly when the feature isn't configured.
 */
export function queueGcalSync(bookingIds: string[]): void {
  const ids = bookingIds.filter(Boolean);
  if (ids.length === 0 || !gcalConfigured()) return;
  after(() =>
    syncBookingsToGoogle(ids).catch((e) =>
      console.error("[gcal] queued sync failed", e),
    ),
  );
}

/**
 * Initial fill + self-heal for a business: pushes future active bookings
 * that have no Google event yet, and clears events of bookings cancelled
 * while the connection was unavailable.
 */
export async function pushAllFutureBookings(
  businessId: string,
): Promise<SyncCounts> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [{ data: missing }, { data: staleCancelled }] = await Promise.all([
    admin
      .from("bookings")
      .select("id")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .gt("ends_at", nowIso)
      .is("gcal_event_id", null)
      .limit(1000),
    admin
      .from("bookings")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "cancelled")
      .not("gcal_event_id", "is", null)
      .limit(1000),
  ]);

  const ids = [
    ...(missing ?? []).map((r) => r.id),
    ...(staleCancelled ?? []).map((r) => r.id),
  ];
  return syncBookingsToGoogle(ids);
}

export interface BusySyncResult {
  connectionId: string;
  googleEmail: string;
  ok: boolean;
  events: number;
  error?: "reconnect_required" | "api_error";
}

/**
 * Pull busy events from Google for every busy-enabled connection of the
 * business and replace the mirrored rows (window: now → +90 days).
 * Runs only when the owner asks (manual «Συγχρονισμός») — per product
 * decision, no background polling.
 */
export async function syncBusyForBusiness(
  businessId: string,
): Promise<BusySyncResult[]> {
  const admin = createAdminClient();
  const results: BusySyncResult[] = [];

  const [{ data: connRows }, { data: biz }] = await Promise.all([
    admin
      .from("calendar_connections")
      .select(CONNECTION_COLS_SECRET)
      .eq("business_id", businessId)
      .eq("busy_enabled", true),
    admin
      .from("businesses")
      .select("id, timezone")
      .eq("id", businessId)
      .maybeSingle(),
  ]);
  const connections = (connRows ?? []) as ConnectionSecretRow[];
  if (connections.length === 0) return results;
  const timeZone = biz?.timezone || "Europe/Athens";

  // Events already adopted as bookings (one-time import) must not double
  // up as busy blocks — the booking itself already occupies the slot.
  const { data: adopted } = await admin
    .from("bookings")
    .select("gcal_event_id")
    .eq("business_id", businessId)
    .not("gcal_event_id", "is", null)
    .limit(3000);
  const excludeIds = new Set(
    (adopted ?? []).map((r) => r.gcal_event_id as string),
  );

  const tokenCache = new Map<string, string | null>();
  const timeMin = new Date().toISOString();
  const timeMax = new Date(
    Date.now() + BUSY_WINDOW_DAYS * 24 * 3600 * 1000,
  ).toISOString();

  for (const conn of connections) {
    const token = await accessTokenFor(admin, conn, tokenCache);
    if (!token) {
      results.push({
        connectionId: conn.id,
        googleEmail: conn.google_email,
        ok: false,
        events: 0,
        error: "reconnect_required",
      });
      continue;
    }
    try {
      const events = await listEventsWindow(
        token,
        conn.calendar_id,
        timeMin,
        timeMax,
      );
      const intervals = busyIntervalsFromEvents(events, timeZone, excludeIds).slice(
        0,
        2000,
      );

      // Full-window replace keeps deletions simple and correct.
      await admin
        .from("external_busy_events")
        .delete()
        .eq("connection_id", conn.id);
      for (let i = 0; i < intervals.length; i += 500) {
        const chunk = intervals.slice(i, i + 500).map((iv) => ({
          connection_id: conn.id,
          business_id: conn.business_id,
          staff_id: conn.staff_id,
          gcal_event_id: iv.gcal_event_id,
          starts_at: iv.starts_at,
          ends_at: iv.ends_at,
          is_all_day: iv.is_all_day,
        }));
        const { error } = await admin.from("external_busy_events").insert(chunk);
        if (error) throw new Error(error.message);
      }
      await admin
        .from("calendar_connections")
        .update({ busy_synced_at: new Date().toISOString(), sync_error: null })
        .eq("id", conn.id);
      results.push({
        connectionId: conn.id,
        googleEmail: conn.google_email,
        ok: true,
        events: intervals.length,
      });
    } catch (e) {
      console.error("[gcal] busy sync failed", conn.id, e);
      await admin
        .from("calendar_connections")
        .update({ sync_error: "api_error" })
        .eq("id", conn.id);
      results.push({
        connectionId: conn.id,
        googleEmail: conn.google_email,
        ok: false,
        events: 0,
        error: "api_error",
      });
    }
  }

  return results;
}

/** Live calendar list for the picker in settings. */
export async function listCalendarsForConnection(
  connectionId: string,
): Promise<
  | { ok: true; calendars: { id: string; summary: string; primary: boolean }[] }
  | { ok: false; error: "reconnect_required" | "api_error" }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select(CONNECTION_COLS_SECRET)
    .eq("id", connectionId)
    .maybeSingle();
  if (!data) return { ok: false, error: "api_error" };
  const token = await accessTokenFor(
    admin,
    data as ConnectionSecretRow,
    new Map(),
  );
  if (!token) return { ok: false, error: "reconnect_required" };
  try {
    return { ok: true, calendars: await listCalendars(token) };
  } catch (e) {
    console.error("[gcal] calendar list failed", e);
    return { ok: false, error: "api_error" };
  }
}

export interface ConnectionSettingsInput {
  staffId: string | null;
  calendarId: string;
  calendarSummary: string | null;
  pushEnabled: boolean;
  busyEnabled: boolean;
}

/**
 * Save a connection's mapping. When the target calendar or staff changes,
 * previously pushed FUTURE events are removed from the old calendar and
 * everything is re-pushed, so Google always mirrors reality; past events
 * are left in place as history (only the linkage is dropped).
 */
export async function applyConnectionSettings(
  connectionId: string,
  input: ConnectionSettingsInput,
): Promise<
  | { ok: true; repushed: SyncCounts | null; busy: BusySyncResult[] | null }
  | { ok: false; error: "staff_taken" | "save_failed" }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select(CONNECTION_COLS_SECRET)
    .eq("id", connectionId)
    .maybeSingle();
  if (!data) return { ok: false, error: "save_failed" };
  const conn = data as ConnectionSecretRow;

  const remap =
    conn.calendar_id !== input.calendarId || conn.staff_id !== input.staffId;
  const busyTurnedOn = input.busyEnabled && !conn.busy_enabled;

  if (remap) {
    const nowIso = new Date().toISOString();
    const { data: linked } = await admin
      .from("bookings")
      .select("id, ends_at, gcal_event_id")
      .eq("gcal_connection_id", conn.id)
      .not("gcal_event_id", "is", null)
      .limit(1000);
    const rows = linked ?? [];
    const future = rows.filter((r) => r.ends_at > nowIso);

    if (future.length > 0) {
      const token = await accessTokenFor(admin, conn, new Map());
      if (token) {
        await inPool(future, 4, async (r) => {
          try {
            await deleteEvent(token, conn.calendar_id, r.gcal_event_id as string);
          } catch (e) {
            console.error("[gcal] remap cleanup failed", r.id, e);
          }
        });
      }
    }
    if (rows.length > 0) {
      // Drop linkage for everything this connection pushed — future events
      // were deleted above and will be re-created; past ones stay as history.
      for (let i = 0; i < rows.length; i += 200) {
        await admin
          .from("bookings")
          .update({ gcal_event_id: null, gcal_connection_id: null })
          .in(
            "id",
            rows.slice(i, i + 200).map((r) => r.id),
          );
      }
    }
  }

  const { error } = await admin
    .from("calendar_connections")
    .update({
      staff_id: input.staffId,
      calendar_id: input.calendarId,
      calendar_summary: input.calendarSummary,
      push_enabled: input.pushEnabled,
      busy_enabled: input.busyEnabled,
    })
    .eq("id", conn.id);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "staff_taken" : "save_failed",
    };
  }

  // Keep the mirrored busy rows consistent with the new mapping.
  if (!input.busyEnabled) {
    await admin.from("external_busy_events").delete().eq("connection_id", conn.id);
  } else if (conn.staff_id !== input.staffId) {
    await admin
      .from("external_busy_events")
      .update({ staff_id: input.staffId })
      .eq("connection_id", conn.id);
  }

  let repushed: SyncCounts | null = null;
  if (remap && input.pushEnabled) {
    repushed = await pushAllFutureBookings(conn.business_id);
  }
  // Enabling busy is itself the manual act — sync right away so the toggle
  // has a visible effect (product decision: no background polling).
  let busy: BusySyncResult[] | null = null;
  if (busyTurnedOn || (remap && input.busyEnabled)) {
    busy = await syncBusyForBusiness(conn.business_id);
  }

  return { ok: true, repushed, busy };
}

/**
 * Upcoming Google events eligible for the one-time import (timed, not
 * created by Qlick, not already imported), window now → +90 days.
 */
export async function listImportableEventsForConnection(
  connectionId: string,
): Promise<
  | { ok: true; events: ImportableEvent[] }
  | { ok: false; error: "reconnect_required" | "api_error" }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select(CONNECTION_COLS_SECRET)
    .eq("id", connectionId)
    .maybeSingle();
  if (!data) return { ok: false, error: "api_error" };
  const conn = data as ConnectionSecretRow;

  const token = await accessTokenFor(admin, conn, new Map());
  if (!token) return { ok: false, error: "reconnect_required" };

  const { data: adopted } = await admin
    .from("bookings")
    .select("gcal_event_id")
    .eq("business_id", conn.business_id)
    .not("gcal_event_id", "is", null)
    .limit(3000);
  const excludeIds = new Set(
    (adopted ?? []).map((r) => r.gcal_event_id as string),
  );

  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(
      Date.now() + BUSY_WINDOW_DAYS * 24 * 3600 * 1000,
    ).toISOString();
    const events = await listEventsWindow(token, conn.calendar_id, timeMin, timeMax);
    return { ok: true, events: importableEventsFrom(events, excludeIds) };
  } catch (e) {
    console.error("[gcal] import list failed", e);
    return { ok: false, error: "api_error" };
  }
}

/**
 * Marks imported events in Google with the qlickBookingId private property,
 * so busy sync skips them and future Qlick edits patch the original event.
 * Best effort — a failed marker only risks a duplicate busy block.
 */
export async function markEventsAdopted(
  connectionId: string,
  pairs: { eventId: string; bookingId: string; businessId: string }[],
): Promise<void> {
  if (pairs.length === 0) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select(CONNECTION_COLS_SECRET)
    .eq("id", connectionId)
    .maybeSingle();
  if (!data) return;
  const conn = data as ConnectionSecretRow;
  const token = await accessTokenFor(admin, conn, new Map());
  if (!token) return;

  await inPool(pairs, 4, async (p) => {
    try {
      await patchEvent(token, conn.calendar_id, p.eventId, {
        extendedProperties: {
          private: { qlickBookingId: p.bookingId, qlickBusinessId: p.businessId },
        },
      });
    } catch (e) {
      console.error("[gcal] adopt marker failed", p.eventId, e);
    }
  });
}

/**
 * Remove a connection: best-effort token revoke at Google, then delete the
 * row (busy events cascade; bookings keep gcal_event_id so a later
 * reconnect of the same account re-adopts the events).
 */
export async function removeConnection(connectionId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("id, refresh_token_enc")
    .eq("id", connectionId)
    .maybeSingle();
  if (!data) return;
  try {
    await revokeToken(decryptToken(data.refresh_token_enc));
  } catch {
    // revoke is best-effort
  }
  await admin.from("calendar_connections").delete().eq("id", connectionId);
}
