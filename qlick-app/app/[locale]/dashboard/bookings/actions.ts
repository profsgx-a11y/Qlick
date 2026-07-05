"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface BookingActionResult {
  ok: boolean;
  error?: string;
}

export interface ClearResult {
  ok: boolean;
  deleted?: number;
  error?: string;
}

export async function clearBookings(
  locale: string,
  scope: "past" | "cancelled",
): Promise<ClearResult> {
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

  const fn =
    scope === "cancelled"
      ? "delete_cancelled_bookings"
      : "delete_past_bookings";

  const { data, error } = await supabase.rpc(fn, {
    p_business_id: biz.id,
  });

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard`);
  return { ok: true, deleted: (data as number) ?? 0 };
}

export async function updateBookingStatus(
  locale: string,
  bookingId: string,
  status: BookingStatus,
): Promise<BookingActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const patch: {
    status: BookingStatus;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;
  } = { status };
  if (status === "cancelled") {
    patch.cancelled_by = "business";
  } else if (status === "confirmed") {
    // Restoring a previously cancelled booking — clear cancellation info
    patch.cancelled_by = null;
    patch.cancellation_reason = null;
  }

  const { error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", bookingId);

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard`);
  return { ok: true };
}
