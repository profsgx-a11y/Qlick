"use server";

import { createClient } from "@/lib/supabase/server";
import {
  computeStaffAwareSlots,
  type DayHours,
  type Closure,
  type StaffBusy,
  type Slot,
} from "@/lib/availability";

export interface SlotsResult {
  slots: Slot[];
  error?: string;
}

export interface AvailableStaffResult {
  staffIds: string[];
  error?: string;
}

/** Shared inputs for slot computation (everything except the chosen staff). */
interface SlotInputs {
  date: string;
  timeZone: string;
  hours: DayHours[];
  closures: Closure[];
  durationMinutes: number;
  staffBusy: StaffBusy[];
  capableStaffIds: string[];
  staffHours: Record<string, Record<number, { open: string; close: string }[]>>;
  customStaffIds: string[];
}

/** Loads everything needed to compute slots for a business/service/date. */
async function loadSlotInputs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  serviceId: string,
  date: string,
): Promise<{ inputs?: SlotInputs; error?: string }> {
  const [{ data: business }, { data: service }, { data: hours }, { data: capable }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, timezone, status")
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, duration_minutes, is_active, bookable_online")
        .eq("id", serviceId)
        .maybeSingle(),
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", businessId),
      // service_staff is publicly readable; the embedded staff row is subject to
      // staff RLS (only active + bookable rows return), so this yields exactly
      // the capable online staff.
      supabase
        .from("service_staff")
        .select("staff_id, staff:staff!inner(id, business_id)")
        .eq("service_id", serviceId),
    ]);

  if (!business || business.status !== "active") {
    return { error: "Το κατάστημα δεν είναι διαθέσιμο." };
  }
  if (!service || !service.is_active || !service.bookable_online) {
    return { error: "Η υπηρεσία δεν είναι διαθέσιμη." };
  }

  const capableStaffIds = (capable ?? [])
    .filter(
      (r) =>
        (r.staff as { business_id: string } | null)?.business_id === businessId,
    )
    .map((r) => r.staff_id);

  const [{ data: busyRows }, { data: closures }] = await Promise.all([
    supabase.rpc("get_staff_busy_intervals", {
      p_business_id: businessId,
      p_from: `${shiftDate(date, -1)}T00:00:00Z`,
      p_to: `${shiftDate(date, 1)}T23:59:59Z`,
    }),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", businessId)
      .eq("date", date),
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

  return {
    inputs: {
      date,
      timeZone: business.timezone || "Europe/Athens",
      hours: (hours ?? []) as DayHours[],
      closures: (closures ?? []) as Closure[],
      durationMinutes: service.duration_minutes,
      staffBusy,
      capableStaffIds,
      staffHours,
      customStaffIds,
    },
  };
}

/**
 * Returns bookable slots for a business/service/date, staff-aware.
 * `staffId` = a specific person, or null/"" for "any available".
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: string, // YYYY-MM-DD
  staffId?: string | null,
): Promise<SlotsResult> {
  const supabase = await createClient();
  const { inputs, error } = await loadSlotInputs(
    supabase,
    businessId,
    serviceId,
    date,
  );
  if (!inputs) return { slots: [], error };

  const slots = computeStaffAwareSlots({
    ...inputs,
    selectedStaffId: staffId || null,
  });
  return { slots };
}

/**
 * Given a specific slot the customer picked (any-staff time), returns which
 * capable staff are actually free to take it — i.e. working then, not booked,
 * not on time-off. Used so the staff step shows only available people.
 */
export async function getAvailableStaffForSlot(
  businessId: string,
  serviceId: string,
  date: string, // YYYY-MM-DD
  startsAtIso: string,
): Promise<AvailableStaffResult> {
  const supabase = await createClient();
  const { inputs, error } = await loadSlotInputs(
    supabase,
    businessId,
    serviceId,
    date,
  );
  if (!inputs) return { staffIds: [], error };

  const staffIds = inputs.capableStaffIds.filter((sid) =>
    computeStaffAwareSlots({ ...inputs, selectedStaffId: sid }).some(
      (s) => s.iso === startsAtIso,
    ),
  );
  return { staffIds };
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface BookingResult {
  ok: boolean;
  bookingId?: string;
  error?: string;
}

export async function submitBooking(params: {
  businessId: string;
  serviceId: string;
  staffId: string | null;
  startsAtIso: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  source?: string;
}): Promise<BookingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase.rpc("create_booking", {
    p_business_id: params.businessId,
    p_service_id: params.serviceId,
    p_staff_id: params.staffId ?? undefined,
    p_starts_at: params.startsAtIso,
    p_customer_name: params.customerName,
    p_customer_phone: params.customerPhone,
    p_notes: params.notes,
    p_source: params.source === "qr" ? "qr" : "web",
  });

  if (error) {
    const msg = error.message || "";
    // Return stable codes; the client maps them to the active locale.
    if (msg.includes("bookings_paused"))
      return { ok: false, error: "bookings_paused" };
    if (msg.includes("email_not_confirmed"))
      return { ok: false, error: "email_not_confirmed" };
    if (msg.includes("account_suspended"))
      return { ok: false, error: "account_suspended" };
    if (msg.includes("too_many_active_bookings"))
      return { ok: false, error: "too_many_active" };
    if (msg.includes("customer_time_conflict"))
      return { ok: false, error: "customer_busy" };
    if (msg.includes("blocked")) return { ok: false, error: "blocked" };
    if (msg.includes("slot_taken")) return { ok: false, error: "slot_taken" };
    if (msg.includes("slot_in_past")) return { ok: false, error: "slot_in_past" };
    if (msg.includes("service_not_available"))
      return { ok: false, error: "service_unavailable" };
    return { ok: false, error: "failed" };
  }

  // Remember the phone on the customer's profile so it pre-fills next time
  // (mirrors how the name is reused). Don't overwrite an existing one.
  if (params.customerPhone) {
    await supabase
      .from("profiles")
      .update({ phone: params.customerPhone })
      .eq("id", user.id)
      .is("phone", null);
  }

  return { ok: true, bookingId: data as string };
}
