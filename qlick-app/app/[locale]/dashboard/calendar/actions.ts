"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import {
  buildDayWindow,
  isWithinOpenHours,
  minutesFromMidnight,
} from "@/lib/calendar";
import { normalizePhone } from "@/lib/validation";
import {
  computeStaffAwareSlots,
  type DayHours,
  type Closure,
  type StaffBusy,
} from "@/lib/availability";

export interface WalkinInput {
  staffId: string | null;
  serviceId: string;
  startsAtIso: string;
  customerName: string;
  customerPhone: string;
  notes: string;
}

export interface WalkinResult {
  ok: boolean;
  error?: string;
  id?: string;
  endsAtIso?: string;
  serviceName?: string | null;
  color?: string | null;
  customerPhone?: string | null;
}

const ACTIVE = ["pending", "confirmed", "completed"];

const NO_CAPACITY = "no_capacity";

/**
 * True if placing a booking [startIso,endIso] (staff = newStaffId) would, at
 * any instant, require more staff than are actually available — i.e.
 * overbooking. Available capacity = active staff MINUS those on time-off
 * (leave/repo) at that instant. Demand per sub-interval = distinct busy staff
 * plus unassigned bookings; if demand exceeds availability, nobody is free to
 * serve it.
 */
async function peakOverCapacity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  startIso: string,
  endIso: string,
  newStaffId: string | null,
  excludeBookingId?: string,
): Promise<boolean> {
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_active", true);
  const activeIds = new Set((staffRows ?? []).map((s) => s.id));
  const capacity = activeIds.size;
  if (capacity === 0) return false; // no staff configured → don't block

  let q = supabase
    .from("bookings")
    .select("starts_at, ends_at, staff_id")
    .eq("business_id", businessId)
    .in("status", ACTIVE)
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  if (excludeBookingId) q = q.neq("id", excludeBookingId);
  const { data: overlaps } = await q;

  // Staff on time-off (άδεια/ρεπό) overlapping the interval reduce capacity.
  const { data: offRows } = await supabase
    .from("staff_time_off")
    .select("staff_id, starts_at, ends_at")
    .eq("business_id", businessId)
    .lt("starts_at", endIso)
    .gt("ends_at", startIso);
  const offs = (offRows ?? [])
    .filter((o) => activeIds.has(o.staff_id))
    .map((o) => ({
      s: new Date(o.starts_at).getTime(),
      e: new Date(o.ends_at).getTime(),
      staff: o.staff_id as string,
    }));

  const ns = new Date(startIso).getTime();
  const ne = new Date(endIso).getTime();
  const ivs = [
    ...(overlaps ?? []).map((b) => ({
      s: new Date(b.starts_at).getTime(),
      e: new Date(b.ends_at).getTime(),
      staff: b.staff_id as string | null,
    })),
    { s: ns, e: ne, staff: newStaffId },
  ];

  // Demand rises at booking starts; availability drops at time-off starts.
  // Sampling every such "start" event within the window catches the worst instant.
  const points = new Set<number>([ns]);
  for (const iv of ivs) if (iv.s > ns && iv.s < ne) points.add(iv.s);
  for (const o of offs) if (o.s > ns && o.s < ne) points.add(o.s);

  for (const t of points) {
    const act = ivs.filter((iv) => iv.s <= t && iv.e > t);
    const busyStaff = new Set(act.filter((iv) => iv.staff).map((iv) => iv.staff));
    const unassigned = act.filter((iv) => !iv.staff).length;
    const demand = busyStaff.size + unassigned;
    const offCount = new Set(
      offs.filter((o) => o.s <= t && o.e > t).map((o) => o.staff),
    ).size;
    if (demand > capacity - offCount) return true;
  }
  return false;
}

/**
 * Create a walk-in / dashboard booking on the calendar. Owner/manager only.
 * Enforces business hours (must finish before closing) and staff-level
 * conflict in the application layer (DB-level RPC guard comes in Phase 4.4).
 */
export async function createWalkin(
  locale: string,
  input: WalkinInput,
): Promise<WalkinResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }
  const tz = biz.timezone || "Europe/Athens";

  if (!input.serviceId) return { ok: false, error: "choose_service" };

  // Both name and phone are optional for a dashboard booking. Phone, if given,
  // must be a real number.
  let phone: string | null = null;
  if (input.customerPhone.trim()) {
    phone = normalizePhone(input.customerPhone);
    if (!phone)
      return { ok: false, error: "invalid_phone" };
  }

  // Source attribution: a phone number means the owner took a phone booking;
  // otherwise (name only, or nothing) it's a walk-in added at the shop.
  const source = phone ? "phone" : "dashboard";

  // Service must belong to this business and be active.
  const { data: svc } = await supabase
    .from("services")
    .select("id, name, price_cents, duration_minutes, color, is_active")
    .eq("id", input.serviceId)
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!svc || !svc.is_active)
    return { ok: false, error: "invalid_service" };

  // Staff (if any) must belong to this business.
  if (input.staffId) {
    const { data: st } = await supabase
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("business_id", biz.id)
      .maybeSingle();
    if (!st) return { ok: false, error: "invalid_staff" };
  }

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime()))
    return { ok: false, error: "invalid_time" };
  const endsAtIso = new Date(
    startsAt.getTime() + svc.duration_minutes * 60_000,
  ).toISOString();

  // Business-hours check: the booking must finish before closing.
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startsAt);

  const [{ data: hourRows }, { data: closureRows }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", biz.id),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", biz.id)
      .eq("date", dateStr),
  ]);

  const win = buildDayWindow(
    dateStr,
    tz,
    (hourRows ?? []) as DayHours[],
    (closureRows ?? []) as Closure[],
    [],
  );
  const sMin = minutesFromMidnight(input.startsAtIso, tz);
  const eMin = minutesFromMidnight(endsAtIso, tz);
  if (!isWithinOpenHours(sMin, eMin, win)) {
    return {
      ok: false,
      error: "outside_hours",
    };
  }

  // Staff-level conflict (skip for the unassigned column).
  if (input.staffId) {
    const { data: clash } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", biz.id)
      .eq("staff_id", input.staffId)
      .in("status", ACTIVE)
      .lt("starts_at", endsAtIso)
      .gt("ends_at", input.startsAtIso)
      .limit(1);
    if (clash && clash.length > 0) {
      return {
        ok: false,
        error: "staff_busy",
      };
    }
  }

  // Capacity: must be at least one free staff for the whole interval.
  if (
    await peakOverCapacity(supabase, biz.id, input.startsAtIso, endsAtIso, input.staffId)
  ) {
    return { ok: false, error: NO_CAPACITY };
  }

  const { data: created, error } = await supabase
    .from("bookings")
    .insert({
      business_id: biz.id,
      customer_id: user.id,
      service_id: svc.id,
      staff_id: input.staffId,
      starts_at: input.startsAtIso,
      ends_at: endsAtIso,
      status: "confirmed",
      source,
      no_staff_preference: !input.staffId,
      customer_name: input.customerName.trim() || null,
      customer_phone: phone,
      customer_notes: input.notes.trim().slice(0, 300) || null,
      price_cents: svc.price_cents,
      service_name: svc.name,
    })
    .select("id")
    .single();

  if (error || !created)
    return { ok: false, error: "create_failed" };

  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard`);

  return {
    ok: true,
    id: created.id,
    endsAtIso,
    serviceName: svc.name,
    color: svc.color,
    customerPhone: phone,
  };
}

/**
 * Toggle the "online bookings paused" flag. Owner/manager only. While paused,
 * customers can't book online (create_booking raises `bookings_paused`), but the
 * owner can still add bookings from the dashboard (walk-ins bypass the RPC).
 */
export async function setBookingsPaused(
  locale: string,
  paused: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ bookings_paused: paused })
    .eq("id", biz.id);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}

export interface MoveInput {
  bookingId: string;
  startsAtIso: string;
  staffId: string | null;
}

export interface MoveResult {
  ok: boolean;
  error?: string;
  endsAtIso?: string;
}

/**
 * Reschedule a booking (drag & drop): new start time and/or staff. Keeps the
 * same duration. Owner/manager only. Re-checks business hours + staff conflict.
 */
export async function moveBooking(
  locale: string,
  input: MoveInput,
): Promise<MoveResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }
  const tz = biz.timezone || "Europe/Athens";

  // Load the booking (must belong to this business); keep its duration.
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at")
    .eq("id", input.bookingId)
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!bk) return { ok: false, error: "booking_not_found" };

  const durationMs =
    new Date(bk.ends_at).getTime() - new Date(bk.starts_at).getTime();
  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime()))
    return { ok: false, error: "invalid_time" };
  const endsAtIso = new Date(startsAt.getTime() + durationMs).toISOString();

  // Staff (if any) must belong to this business.
  if (input.staffId) {
    const { data: st } = await supabase
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("business_id", biz.id)
      .maybeSingle();
    if (!st) return { ok: false, error: "invalid_staff" };
  }

  // Business-hours check.
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startsAt);
  const [{ data: hourRows }, { data: closureRows }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", biz.id),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", biz.id)
      .eq("date", dateStr),
  ]);
  const win = buildDayWindow(
    dateStr,
    tz,
    (hourRows ?? []) as DayHours[],
    (closureRows ?? []) as Closure[],
    [],
  );
  const sMin = minutesFromMidnight(input.startsAtIso, tz);
  const eMin = minutesFromMidnight(endsAtIso, tz);
  if (!isWithinOpenHours(sMin, eMin, win)) {
    return {
      ok: false,
      error: "outside_hours",
    };
  }

  // Staff conflict (exclude this booking).
  if (input.staffId) {
    const { data: clash } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", biz.id)
      .eq("staff_id", input.staffId)
      .in("status", ACTIVE)
      .neq("id", input.bookingId)
      .lt("starts_at", endsAtIso)
      .gt("ends_at", input.startsAtIso)
      .limit(1);
    if (clash && clash.length > 0) {
      return {
        ok: false,
        error: "staff_busy",
      };
    }
  }

  // Capacity: must be at least one free staff for the whole interval.
  if (
    await peakOverCapacity(
      supabase,
      biz.id,
      input.startsAtIso,
      endsAtIso,
      input.staffId,
      input.bookingId,
    )
  ) {
    return { ok: false, error: NO_CAPACITY };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      starts_at: input.startsAtIso,
      ends_at: endsAtIso,
      staff_id: input.staffId,
    })
    .eq("id", input.bookingId);
  if (error) return { ok: false, error: "move_failed" };

  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  return { ok: true, endsAtIso };
}

export interface ResizeInput {
  bookingId: string;
  endsAtIso: string;
}

export interface ResizeResult {
  ok: boolean;
  error?: string;
}

/**
 * Change a booking's duration (drag bottom edge): keep start, set new end.
 * Owner/manager only. Re-checks business hours + staff conflict + capacity.
 */
export async function resizeBooking(
  locale: string,
  input: ResizeInput,
): Promise<ResizeResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }
  const tz = biz.timezone || "Europe/Athens";

  const { data: bk } = await supabase
    .from("bookings")
    .select("id, starts_at, staff_id")
    .eq("id", input.bookingId)
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!bk) return { ok: false, error: "booking_not_found" };

  const startIso = bk.starts_at;
  const start = new Date(startIso).getTime();
  const end = new Date(input.endsAtIso).getTime();
  if (Number.isNaN(end) || end - start < 5 * 60_000) {
    return { ok: false, error: "duration_too_short" };
  }

  // Business hours.
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startIso));
  const [{ data: hourRows }, { data: closureRows }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", biz.id),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", biz.id)
      .eq("date", dateStr),
  ]);
  const win = buildDayWindow(
    dateStr,
    tz,
    (hourRows ?? []) as DayHours[],
    (closureRows ?? []) as Closure[],
    [],
  );
  if (
    !isWithinOpenHours(
      minutesFromMidnight(startIso, tz),
      minutesFromMidnight(input.endsAtIso, tz),
      win,
    )
  ) {
    return {
      ok: false,
      error: "outside_hours",
    };
  }

  // Staff conflict (exclude self).
  if (bk.staff_id) {
    const { data: clash } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", biz.id)
      .eq("staff_id", bk.staff_id)
      .in("status", ACTIVE)
      .neq("id", input.bookingId)
      .lt("starts_at", input.endsAtIso)
      .gt("ends_at", startIso)
      .limit(1);
    if (clash && clash.length > 0) {
      return {
        ok: false,
        error: "staff_busy",
      };
    }
  }

  if (
    await peakOverCapacity(
      supabase,
      biz.id,
      startIso,
      input.endsAtIso,
      bk.staff_id,
      input.bookingId,
    )
  ) {
    return { ok: false, error: NO_CAPACITY };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ ends_at: input.endsAtIso })
    .eq("id", input.bookingId);
  if (error) return { ok: false, error: "resize_failed" };

  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  return { ok: true };
}

export interface MoveSlotsResult {
  ok: boolean;
  error?: string;
  slots?: { iso: string; label: string }[];
}

function shiftDateStr(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Available start times to MOVE an existing booking to a given day, keeping its
 * current duration and staff. Owner/manager only. Uses the same availability
 * logic as the customer booking flow (hours + staff/capacity), excluding the
 * booking itself. Mobile-friendly alternative to drag & drop.
 */
export async function availableMoveSlots(input: {
  bookingId: string;
  date: string; // YYYY-MM-DD (business timezone)
}): Promise<MoveSlotsResult> {
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }
  const tz = biz.timezone || "Europe/Athens";

  const { data: bk } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, staff_id, service_id")
    .eq("id", input.bookingId)
    .eq("business_id", biz.id)
    .maybeSingle();
  if (!bk) return { ok: false, error: "booking_not_found" };

  const durationMinutes = Math.max(
    5,
    Math.round(
      (new Date(bk.ends_at).getTime() - new Date(bk.starts_at).getTime()) /
        60_000,
    ),
  );

  // Capable, active staff for this booking's service.
  const { data: capable } = await supabase
    .from("service_staff")
    .select("staff_id, staff:staff!inner(id, business_id, is_active)")
    .eq("service_id", bk.service_id ?? "");
  const capableStaffIds = (capable ?? [])
    .filter((r) => {
      const s = r.staff as { business_id: string; is_active: boolean } | null;
      return s?.business_id === biz.id && s.is_active;
    })
    .map((r) => r.staff_id);

  // Hours, closures, and busy intervals (excluding this booking).
  const [{ data: hours }, { data: closures }, { data: busyRows }] =
    await Promise.all([
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", biz.id),
      supabase
        .from("business_closures")
        .select("date, is_closed, special_open_time, special_close_time")
        .eq("business_id", biz.id)
        .eq("date", input.date),
      supabase
        .from("bookings")
        .select("staff_id, starts_at, ends_at")
        .eq("business_id", biz.id)
        .in("status", ACTIVE)
        .neq("id", input.bookingId)
        .gte("starts_at", `${shiftDateStr(input.date, -1)}T00:00:00Z`)
        .lte("starts_at", `${shiftDateStr(input.date, 1)}T23:59:59Z`),
    ]);

  const staffBusy: StaffBusy[] = (busyRows ?? []).map((b) => ({
    staffId: b.staff_id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
  }));

  // Per-staff custom weekly hours (if any).
  const shRows = capableStaffIds.length
    ? (
        await supabase
          .from("staff_hours")
          .select("staff_id, day_of_week, open_time, close_time")
          .in("staff_id", capableStaffIds)
      ).data ?? []
    : [];
  const staffHours: Record<
    string,
    Record<number, { open: string; close: string }[]>
  > = {};
  const customStaffIds: string[] = [];
  for (const r of shRows) {
    if (!staffHours[r.staff_id]) {
      staffHours[r.staff_id] = {};
      customStaffIds.push(r.staff_id);
    }
    (staffHours[r.staff_id][r.day_of_week] ??= []).push({
      open: r.open_time,
      close: r.close_time,
    });
  }

  const slots = computeStaffAwareSlots({
    date: input.date,
    timeZone: tz,
    hours: (hours ?? []) as DayHours[],
    closures: (closures ?? []) as Closure[],
    durationMinutes,
    staffBusy,
    capableStaffIds,
    selectedStaffId: bk.staff_id,
    staffHours,
    customStaffIds,
  });

  return { ok: true, slots: slots.map((s) => ({ iso: s.iso, label: s.label })) };
}
