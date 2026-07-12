"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import {
  buildDayWindow,
  isWithinOpenHours,
  minutesFromMidnight,
} from "@/lib/calendar";
import type { DayHours, Closure } from "@/lib/availability";
import {
  computeOccurrenceDates,
  occurrenceStartIso,
  type PatternType,
} from "@/lib/recurrence";

const ACTIVE = ["pending", "confirmed", "completed"];
const MAX_OCCURRENCES = 12;

export interface SeriesRuleInput {
  businessCustomerId: string;
  serviceId: string;
  staffId: string | null;
  patternType: PatternType;
  intervalN: number;
  weekday: number | null;
  nth: number | null;
  dayOfMonth: number | null;
  timeOfDay: string; // "HH:MM"
  startDate: string; // YYYY-MM-DD (business tz)
  count: number;
}

export type OccurrenceStatus = "ok" | "closed" | "busy" | "past";

export interface OccurrencePreview {
  startIso: string;
  endIso: string;
  dateStr: string;
  status: OccurrenceStatus;
}

interface Ctx {
  supabase: Awaited<ReturnType<typeof createClient>>;
  businessId: string;
  userId: string;
  tz: string;
}

async function getCtx(): Promise<Ctx | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager"))
    return null;
  return {
    supabase,
    businessId: biz.id as string,
    userId: user.id,
    tz: (biz.timezone as string) || "Europe/Athens",
  };
}

interface Interval {
  s: number;
  e: number;
  staff: string | null;
}

/** In-memory peak-capacity check (mirrors the calendar walk-in guard). */
function overCapacity(
  intervals: Interval[],
  capacity: number,
  offs: { s: number; e: number; staff: string }[],
  startMs: number,
  endMs: number,
  newStaffId: string | null,
): boolean {
  if (capacity === 0) return false;
  const ivs: Interval[] = [
    ...intervals.filter((b) => b.s < endMs && b.e > startMs),
    { s: startMs, e: endMs, staff: newStaffId },
  ];
  const points = new Set<number>([startMs]);
  for (const iv of ivs) if (iv.s > startMs && iv.s < endMs) points.add(iv.s);
  for (const o of offs) if (o.s > startMs && o.s < endMs) points.add(o.s);
  for (const t of points) {
    const act = ivs.filter((iv) => iv.s <= t && iv.e > t);
    const busyStaff = new Set(
      act.filter((iv) => iv.staff).map((iv) => iv.staff),
    );
    const unassigned = act.filter((iv) => !iv.staff).length;
    const demand = busyStaff.size + unassigned;
    const offCount = new Set(
      offs.filter((o) => o.s <= t && o.e > t).map((o) => o.staff),
    ).size;
    if (demand > capacity - offCount) return true;
  }
  return false;
}

interface EvalContext {
  hours: DayHours[];
  closuresByDate: Map<string, Closure[]>;
  intervals: Interval[];
  offs: { s: number; e: number; staff: string }[];
  capacity: number;
  durationMs: number;
  tz: string;
  nowMs: number;
}

function evalOccurrence(
  dateStr: string,
  startIso: string,
  staffId: string | null,
  ctx: EvalContext,
): OccurrenceStatus {
  const startMs = new Date(startIso).getTime();
  const endMs = startMs + ctx.durationMs;
  const endIso = new Date(endMs).toISOString();
  if (startMs < ctx.nowMs) return "past";

  const win = buildDayWindow(
    dateStr,
    ctx.tz,
    ctx.hours,
    ctx.closuresByDate.get(dateStr) ?? [],
    [],
  );
  const sMin = minutesFromMidnight(startIso, ctx.tz);
  const eMin = minutesFromMidnight(endIso, ctx.tz);
  if (!isWithinOpenHours(sMin, eMin, win)) return "closed";

  if (staffId) {
    const clash = ctx.intervals.some(
      (b) => b.staff === staffId && b.s < endMs && b.e > startMs,
    );
    if (clash) return "busy";
  }
  if (overCapacity(ctx.intervals, ctx.capacity, ctx.offs, startMs, endMs, staffId))
    return "busy";
  return "ok";
}

async function loadService(
  supabase: Ctx["supabase"],
  businessId: string,
  serviceId: string,
) {
  const { data: svc } = await supabase
    .from("services")
    .select("id, name, price_cents, duration_minutes, is_active")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle();
  return svc && svc.is_active ? svc : null;
}

async function loadEvalContext(
  ctx: Ctx,
  durationMinutes: number,
  dates: string[],
  startIsos: string[],
): Promise<EvalContext> {
  const { supabase, businessId, tz } = ctx;
  const times = startIsos.map((s) => new Date(s).getTime());
  const minMs = Math.min(...times) - 86_400_000;
  const maxMs = Math.max(...times) + durationMinutes * 60_000 + 86_400_000;
  const fromIso = new Date(minMs).toISOString();
  const toIso = new Date(maxMs).toISOString();

  const [{ data: hourRows }, { data: closureRows }, { data: bookingRows }, { data: staffRows }, { data: offRows }] =
    await Promise.all([
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", businessId),
      supabase
        .from("business_closures")
        .select("date, is_closed, special_open_time, special_close_time")
        .eq("business_id", businessId)
        .in("date", dates),
      supabase
        .from("bookings")
        .select("starts_at, ends_at, staff_id")
        .eq("business_id", businessId)
        .in("status", ACTIVE)
        .lt("starts_at", toIso)
        .gt("ends_at", fromIso),
      supabase
        .from("staff")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true),
      supabase
        .from("staff_time_off")
        .select("staff_id, starts_at, ends_at")
        .eq("business_id", businessId)
        .lt("starts_at", toIso)
        .gt("ends_at", fromIso),
    ]);

  const closuresByDate = new Map<string, Closure[]>();
  for (const c of (closureRows ?? []) as Closure[]) {
    const list = closuresByDate.get(c.date) ?? [];
    list.push(c);
    closuresByDate.set(c.date, list);
  }
  const activeIds = new Set((staffRows ?? []).map((s) => s.id));
  const intervals: Interval[] = (bookingRows ?? []).map((b) => ({
    s: new Date(b.starts_at).getTime(),
    e: new Date(b.ends_at).getTime(),
    staff: b.staff_id,
  }));
  const offs = (offRows ?? [])
    .filter((o) => activeIds.has(o.staff_id))
    .map((o) => ({
      s: new Date(o.starts_at).getTime(),
      e: new Date(o.ends_at).getTime(),
      staff: o.staff_id as string,
    }));

  return {
    hours: (hourRows ?? []) as DayHours[],
    closuresByDate,
    intervals,
    offs,
    capacity: activeIds.size,
    durationMs: durationMinutes * 60_000,
    tz,
    nowMs: Date.now(),
  };
}

export async function previewSeries(input: SeriesRuleInput): Promise<{
  ok: boolean;
  error?: string;
  occurrences?: OccurrencePreview[];
}> {
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: "no_permission" };

  const svc = await loadService(ctx.supabase, ctx.businessId, input.serviceId);
  if (!svc) return { ok: false, error: "invalid_service" };
  if (!/^\d{2}:\d{2}$/.test(input.timeOfDay))
    return { ok: false, error: "invalid_time" };

  const count = Math.min(Math.max(1, input.count), MAX_OCCURRENCES);
  const dates = computeOccurrenceDates(
    {
      patternType: input.patternType,
      intervalN: input.intervalN,
      weekday: input.weekday,
      nth: input.nth,
      dayOfMonth: input.dayOfMonth,
      timeOfDay: input.timeOfDay,
    },
    input.startDate,
    count,
    ctx.tz,
  );
  if (dates.length === 0) return { ok: true, occurrences: [] };

  const startIsos = dates.map((d) =>
    occurrenceStartIso(d, input.timeOfDay, ctx.tz),
  );
  const evalCtx = await loadEvalContext(
    ctx,
    svc.duration_minutes,
    dates,
    startIsos,
  );

  const occurrences: OccurrencePreview[] = dates.map((dateStr, i) => {
    const startIso = startIsos[i];
    const endIso = new Date(
      new Date(startIso).getTime() + evalCtx.durationMs,
    ).toISOString();
    return {
      startIso,
      endIso,
      dateStr,
      status: evalOccurrence(dateStr, startIso, input.staffId, evalCtx),
    };
  });

  return { ok: true, occurrences };
}

export async function createSeries(
  locale: string,
  input: SeriesRuleInput & { selectedIsos: string[] },
): Promise<{
  ok: boolean;
  error?: string;
  created?: number;
  skipped?: number;
}> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: "no_permission" };
  const { supabase, businessId, userId } = ctx;

  const svc = await loadService(supabase, businessId, input.serviceId);
  if (!svc) return { ok: false, error: "invalid_service" };

  // Staff (if any) must belong to this business.
  if (input.staffId) {
    const { data: st } = await supabase
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!st) return { ok: false, error: "invalid_staff" };
  }

  // The customer card supplies the name/phone stamped on each booking.
  const { data: card } = await supabase
    .from("business_customers")
    .select("id, first_name, last_name, phone")
    .eq("id", input.businessCustomerId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!card) return { ok: false, error: "not_found" };

  const selected = [...new Set(input.selectedIsos)].sort();
  if (selected.length === 0) return { ok: false, error: "no_occurrences" };

  const evalCtx = await loadEvalContext(
    ctx,
    svc.duration_minutes,
    selected.map((iso) => localDate(iso, ctx.tz)), // local dates for closures
    selected, // start ISOs for the fetch range
  );

  // Create the series record first.
  const { data: series, error: seriesErr } = await supabase
    .from("recurring_series")
    .insert({
      business_id: businessId,
      business_customer_id: card.id,
      service_id: svc.id,
      staff_id: input.staffId,
      no_staff_preference: !input.staffId,
      service_name: svc.name,
      price_cents: svc.price_cents,
      duration_minutes: svc.duration_minutes,
      pattern_type: input.patternType,
      interval_n: Math.max(1, input.intervalN),
      weekday: input.weekday,
      nth: input.nth,
      day_of_month: input.dayOfMonth,
      time_of_day: input.timeOfDay,
      status: "active",
    })
    .select("id")
    .single();
  if (seriesErr || !series) return { ok: false, error: "save_failed" };

  const customerName =
    [card.first_name, card.last_name].filter(Boolean).join(" ").trim() || null;

  let created = 0;
  let skipped = 0;
  for (const startIso of selected) {
    const dateStr = localDate(startIso, ctx.tz);
    const status = evalOccurrence(dateStr, startIso, input.staffId, evalCtx);
    if (status !== "ok") {
      skipped += 1;
      continue;
    }
    const endMs = new Date(startIso).getTime() + evalCtx.durationMs;
    const endIso = new Date(endMs).toISOString();
    const { error: insErr } = await supabase.from("bookings").insert({
      business_id: businessId,
      customer_id: userId,
      business_customer_id: card.id,
      series_id: series.id,
      service_id: svc.id,
      staff_id: input.staffId,
      starts_at: startIso,
      ends_at: endIso,
      status: "confirmed",
      source: "dashboard",
      no_staff_preference: !input.staffId,
      customer_name: customerName,
      customer_phone: card.phone,
      price_cents: svc.price_cents,
      service_name: svc.name,
    });
    if (insErr) {
      skipped += 1;
      continue;
    }
    created += 1;
    // Reflect the new booking so later occurrences in this batch see it.
    evalCtx.intervals.push({
      s: new Date(startIso).getTime(),
      e: endMs,
      staff: input.staffId,
    });
  }

  if (created === 0) {
    // Nothing booked — drop the empty series.
    await supabase.from("recurring_series").delete().eq("id", series.id);
    return { ok: false, error: "no_occurrences" };
  }

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  return { ok: true, created, skipped };
}

/** Cancel a single occurrence (one booking) of a series. Owner/manager only. */
export async function cancelSeriesBooking(
  locale: string,
  bookingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: "no_permission" };
  const { supabase, businessId, userId } = ctx;

  const { data: bk } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!bk) return { ok: false, error: "not_found" };

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: userId,
      cancellation_reason: "series_occurrence_cancelled",
    })
    .eq("id", bookingId)
    .eq("business_id", businessId);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  return { ok: true };
}

export async function endSeries(
  locale: string,
  seriesId: string,
): Promise<{ ok: boolean; error?: string; cancelled?: number }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: "no_permission" };
  const { supabase, businessId, userId } = ctx;

  const { data: series } = await supabase
    .from("recurring_series")
    .select("id")
    .eq("id", seriesId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!series) return { ok: false, error: "not_found" };

  const nowIso = new Date().toISOString();
  // Cancel only the future, not-yet-happened bookings of the series.
  const { data: cancelledRows, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: userId,
      cancellation_reason: "series_ended",
    })
    .eq("business_id", businessId)
    .eq("series_id", seriesId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", nowIso)
    .select("id");
  if (error) return { ok: false, error: "save_failed" };

  await supabase
    .from("recurring_series")
    .update({ status: "ended" })
    .eq("id", seriesId)
    .eq("business_id", businessId);

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  return { ok: true, cancelled: (cancelledRows ?? []).length };
}

function localDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
