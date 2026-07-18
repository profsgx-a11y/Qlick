"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale } from "@/i18n/config";
import { gcalConfigured } from "@/lib/google/calendar";
import {
  ignoreImportableEvents,
  listImportableEventsForConnection,
  markEventsAdopted,
} from "@/lib/google/sync";
import {
  distributeStaff,
  type DistributeBusy,
  type DistributeEvent,
  type DistributeStaff,
  type ImportableEvent,
} from "@/lib/google/mapping";
import { dayOfWeekInZone } from "@/lib/availability";
import { localDateInZone, minutesFromMidnight } from "@/lib/calendar";

type Admin = ReturnType<typeof createAdminClient>;

const IMPORT_WINDOW_DAYS = 90;

function hmToMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Suggested staff for each event using the "smart distribution" rules:
 * respects service capability, working hours and existing bookings, spread
 * evenly across the team. Returns {} on any data hiccup (falls back to no
 * suggestion → unassigned).
 */
async function computeImportSuggestions(
  admin: Admin,
  bizId: string,
  events: ImportableEvent[],
  serviceId: string,
): Promise<Record<string, string>> {
  const [{ data: biz }, { data: staffRows }, { data: svc }] = await Promise.all([
    admin.from("businesses").select("timezone").eq("id", bizId).maybeSingle(),
    admin
      .from("staff")
      .select("id, is_active, is_bookable")
      .eq("business_id", bizId)
      .eq("is_active", true)
      .eq("is_bookable", true),
    admin
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", bizId)
      .maybeSingle(),
  ]);
  const staffIds = (staffRows ?? []).map((s) => s.id);
  const durationMin = svc?.duration_minutes ?? 30;
  if (staffIds.length === 0) return {};

  const nowMs = Date.now();
  const [{ data: ssRows }, { data: bizHours }, { data: staffHours }, { data: bkRows }] =
    await Promise.all([
      admin.from("service_staff").select("staff_id, service_id").in("staff_id", staffIds),
      admin
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", bizId),
      admin
        .from("staff_hours")
        .select("staff_id, day_of_week, open_time, close_time")
        .in("staff_id", staffIds),
      admin
        .from("bookings")
        .select("staff_id, starts_at, ends_at")
        .eq("business_id", bizId)
        .in("status", ["pending", "confirmed"])
        .not("staff_id", "is", null)
        .gt("ends_at", new Date(nowMs).toISOString())
        .lt("starts_at", new Date(nowMs + IMPORT_WINDOW_DAYS * 864e5).toISOString()),
    ]);

  const capability = new Map<string, string[]>();
  for (const r of ssRows ?? []) {
    const list = capability.get(r.staff_id);
    if (list) list.push(r.service_id);
    else capability.set(r.staff_id, [r.service_id]);
  }

  // Business default windows per weekday.
  const bizByDow: Record<number, { s: number; e: number }[]> = {};
  for (const r of bizHours ?? []) {
    const s = hmToMin(r.open_time);
    const e = hmToMin(r.close_time);
    if (r.is_closed || s === null || e === null) continue;
    (bizByDow[r.day_of_week] ??= []).push({ s, e });
  }
  // Staff with any custom hours use only those; others inherit business hours.
  const customStaff = new Set((staffHours ?? []).map((r) => r.staff_id));
  const staffByDow: Record<string, Record<number, { s: number; e: number }[]>> = {};
  for (const r of staffHours ?? []) {
    const s = hmToMin(r.open_time);
    const e = hmToMin(r.close_time);
    if (s === null || e === null) continue;
    ((staffByDow[r.staff_id] ??= {})[r.day_of_week] ??= []).push({ s, e });
  }

  const staff: DistributeStaff[] = staffIds.map((id) => ({
    id,
    serviceIds: capability.get(id) ?? [],
    weeklyOpen: customStaff.has(id) ? (staffByDow[id] ?? {}) : bizByDow,
  }));

  const existing: DistributeBusy[] = (bkRows ?? []).map((b) => ({
    staffId: b.staff_id as string,
    startMs: Date.parse(b.starts_at),
    endMs: Date.parse(b.ends_at),
  }));

  const tz = biz?.timezone || "Europe/Athens";
  const distEvents: DistributeEvent[] = events.map((e) => {
    const startMs = Date.parse(e.startsAtIso);
    const startMin = minutesFromMidnight(e.startsAtIso, tz);
    const dow = dayOfWeekInZone(localDateInZone(e.startsAtIso, tz), tz);
    return {
      gcalEventId: e.gcalEventId,
      startMs,
      endMs: startMs + durationMin * 60_000,
      startMin,
      endMin: startMin + durationMin,
      dow,
      serviceId,
    };
  });

  return Object.fromEntries(distributeStaff(distEvents, staff, existing));
}

/** Caller must manage a business and own the connection. */
async function requireConnection(connectionId: string): Promise<
  | {
      bizId: string;
      userId: string;
      conn: { id: string; staff_id: string | null };
    }
  | { error: string }
> {
  if (!gcalConfigured()) return { error: "gcal_not_configured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no_permission" };
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { error: "no_permission" };
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("calendar_connections")
    .select("id, business_id, staff_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn || conn.business_id !== biz.id) return { error: "no_permission" };
  return {
    bizId: biz.id,
    userId: user.id,
    conn: { id: conn.id, staff_id: conn.staff_id },
  };
}

export interface GcalImportListResult {
  ok: boolean;
  error?: string;
  events?: ImportableEvent[];
  /** gcalEventId → suggested staffId (smart mode only). */
  suggestions?: Record<string, string>;
}

export async function listGoogleImportEvents(
  connectionId: string,
  opts?: { mode: "smart" | "single"; serviceId: string | null },
): Promise<GcalImportListResult> {
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const res = await listImportableEventsForConnection(connectionId);
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "reconnect_required" ? "gcal_reconnect" : "gcal_api_error",
    };
  }

  let suggestions: Record<string, string> = {};
  if (opts?.mode === "smart" && opts.serviceId && res.events.length > 0) {
    try {
      suggestions = await computeImportSuggestions(
        createAdminClient(),
        ctx.bizId,
        res.events,
        opts.serviceId,
      );
    } catch (e) {
      console.error("[gcal] suggestion compute failed", e);
    }
  }
  return { ok: true, events: res.events, suggestions };
}

export interface GcalImportResult {
  ok: boolean;
  error?: string;
  imported?: number;
  duplicates?: number;
}

/**
 * One-time import: turns the selected upcoming Google events into confirmed
 * Qlick bookings. The event list is re-fetched server-side (the client only
 * sends ids), events already imported are skipped, and each imported event
 * is marked in Google as Qlick-managed (anti-loop + future edits patch it).
 */
export async function importGoogleEvents(
  locale: string,
  connectionId: string,
  input: {
    rows: {
      eventId: string;
      serviceId: string;
      staffId: string | null;
      durationMinutes: number;
    }[];
  },
): Promise<GcalImportResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const rows = (input.rows ?? []).filter((r) => r.eventId && r.serviceId);
  const chosen = new Set(rows.map((r) => r.eventId));
  if (chosen.size === 0) return { ok: false, error: "gcal_import_failed" };

  const admin = createAdminClient();

  // Services / staff the rows reference must belong to this business.
  const [{ data: svcRows }, { data: staffRows }] = await Promise.all([
    admin
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("business_id", ctx.bizId)
      .eq("is_active", true),
    admin
      .from("staff")
      .select("id")
      .eq("business_id", ctx.bizId)
      .eq("is_active", true)
      .eq("is_bookable", true),
  ]);
  const svcById = new Map((svcRows ?? []).map((s) => [s.id, s]));
  const staffOk = new Set((staffRows ?? []).map((s) => s.id));

  const listed = await listImportableEventsForConnection(connectionId);
  if (!listed.ok) {
    return {
      ok: false,
      error:
        listed.error === "reconnect_required" ? "gcal_reconnect" : "gcal_api_error",
    };
  }
  const evById = new Map(listed.events.map((e) => [e.gcalEventId, e]));

  // Events adopted since the preview was loaded count as duplicates.
  const { data: existing } = await admin
    .from("bookings")
    .select("gcal_event_id")
    .eq("business_id", ctx.bizId)
    .in("gcal_event_id", [...chosen])
    .not("gcal_event_id", "is", null);
  const already = new Set((existing ?? []).map((r) => r.gcal_event_id as string));

  let imported = 0;
  const adopted: { eventId: string; bookingId: string; businessId: string }[] = [];

  for (const row of rows) {
    if (already.has(row.eventId)) continue;
    const e = evById.get(row.eventId);
    const svc = svcById.get(row.serviceId);
    if (!e || !svc) continue;

    // Empty/invalid staff → unassigned column (no_staff_preference).
    const staffId = row.staffId && staffOk.has(row.staffId) ? row.staffId : null;
    const duration = Math.min(
      Math.max(Math.round(row.durationMinutes) || svc.duration_minutes, 5),
      24 * 60,
    );
    const endsAt = new Date(
      Date.parse(e.startsAtIso) + duration * 60_000,
    ).toISOString();

    const { data: ins, error } = await admin
      .from("bookings")
      .insert({
        business_id: ctx.bizId,
        customer_id: ctx.userId, // walk-in pattern: the owner "holds" it
        service_id: svc.id,
        service_name: svc.name,
        staff_id: staffId,
        starts_at: e.startsAtIso,
        ends_at: endsAt,
        status: "confirmed",
        source: "gcal",
        no_staff_preference: !staffId,
        customer_name: e.summary.slice(0, 120) || null,
        price_cents: svc.price_cents,
        gcal_event_id: e.gcalEventId,
        gcal_connection_id: ctx.conn.id,
        gcal_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !ins) {
      console.error("[gcal] import insert failed", e.gcalEventId, error?.message);
      continue;
    }
    imported++;
    adopted.push({
      eventId: e.gcalEventId,
      bookingId: ins.id,
      businessId: ctx.bizId,
    });
  }

  await markEventsAdopted(connectionId, adopted);

  // Clear any mirrored busy blocks for the events we just imported — the
  // booking now occupies the slot, so the "Google · Busy" overlay would be a
  // duplicate until the next busy sync.
  const importedEventIds = adopted.map((a) => a.eventId);
  if (importedEventIds.length > 0) {
    await admin
      .from("external_busy_events")
      .delete()
      .eq("business_id", ctx.bizId)
      .in("gcal_event_id", importedEventIds);
  }

  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard`);

  return {
    ok: true,
    imported,
    duplicates: [...chosen].filter((id) => already.has(id)).length,
  };
}

/**
 * "No, don't import these": marks the given Google events so they stop being
 * offered as unregistered appointments on future syncs. The times stay open
 * for online bookings (the owner chose not to register them).
 */
export async function ignoreGoogleEvents(
  connectionId: string,
  eventIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  await ignoreImportableEvents(connectionId, eventIds);
  return { ok: true };
}
