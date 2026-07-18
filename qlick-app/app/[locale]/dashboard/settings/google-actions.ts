"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale } from "@/i18n/config";
import { gcalConfigured } from "@/lib/google/calendar";
import {
  applyConnectionSettings,
  countUnregisteredEvents,
  listCalendarsForConnection,
  pushAllFutureBookings,
  removeConnection,
  type SyncCounts,
} from "@/lib/google/sync";

/** Caller must manage a business; returns its id or an error code. */
async function requireManagedBusiness(): Promise<
  { bizId: string } | { error: string }
> {
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { error: "no_permission" };
  }
  return { bizId: biz.id };
}

/** The connection must belong to the caller's business. */
async function requireConnection(
  connectionId: string,
): Promise<{ bizId: string } | { error: string }> {
  const ctx = await requireManagedBusiness();
  if ("error" in ctx) return ctx;
  if (!gcalConfigured()) return { error: "gcal_not_configured" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("id, business_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!data || data.business_id !== ctx.bizId) return { error: "no_permission" };
  return { bizId: ctx.bizId };
}

function revalidateDash(locale: string) {
  const safeLocale = hasLocale(locale) ? locale : "el";
  revalidatePath(`/${safeLocale}/dashboard/settings`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/bookings`);
}

export interface CalendarsResult {
  ok: boolean;
  calendars?: { id: string; summary: string; primary: boolean }[];
  error?: string;
}

export async function getGoogleCalendars(
  connectionId: string,
): Promise<CalendarsResult> {
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const res = await listCalendarsForConnection(connectionId);
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "reconnect_required" ? "gcal_reconnect" : "gcal_api_error",
    };
  }
  return { ok: true, calendars: res.calendars };
}

export interface SaveConnectionResult {
  ok: boolean;
  error?: string;
  /** Populated when saving triggered a re-push / busy sync. */
  repushed?: SyncCounts | null;
  busyEvents?: number | null;
}

export async function updateGoogleConnection(
  locale: string,
  connectionId: string,
  input: {
    staffId: string | null;
    calendarId: string;
    calendarSummary: string | null;
    pushEnabled: boolean;
    busyEnabled: boolean;
  },
): Promise<SaveConnectionResult> {
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const admin = createAdminClient();

  // Staff mapping is optional: null = a business-wide calendar that receives
  // every staff member's appointments. When a person is chosen they must be
  // an active member of THIS business.
  const staffId = input.staffId || null;
  if (staffId) {
    const { data: staffRows } = await admin
      .from("staff")
      .select("id, is_active")
      .eq("business_id", ctx.bizId);
    const valid = (staffRows ?? []).some((s) => s.id === staffId && s.is_active);
    if (!valid) return { ok: false, error: "gcal_invalid_staff" };
  }

  const calendarId = input.calendarId.trim() || "primary";
  const res = await applyConnectionSettings(connectionId, {
    staffId,
    calendarId,
    calendarSummary: input.calendarSummary?.trim() || null,
    pushEnabled: Boolean(input.pushEnabled),
    busyEnabled: Boolean(input.busyEnabled),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "staff_taken" ? "gcal_staff_taken" : "save_failed",
    };
  }

  revalidateDash(locale);
  return {
    ok: true,
    repushed: res.repushed,
    busyEvents: res.busy ? res.busy.reduce((n, r) => n + r.events, 0) : null,
  };
}

export interface PushAllResult {
  ok: boolean;
  error?: string;
  counts?: SyncCounts;
}

export async function pushAllFutureToGoogle(
  locale: string,
): Promise<PushAllResult> {
  const ctx = await requireManagedBusiness();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!gcalConfigured()) return { ok: false, error: "gcal_not_configured" };

  const counts = await pushAllFutureBookings(ctx.bizId);
  revalidateDash(locale);
  return { ok: true, counts };
}

export interface SyncNowResult {
  ok: boolean;
  error?: string;
  /** created + updated + deleted events pushed to Google. */
  pushed?: number;
  /** upcoming Google events not yet in Qlick (and not dismissed). */
  unregistered?: number;
}

/**
 * Full manual sync from the Bookings tab: push every future booking to
 * Google, then count Google events that aren't Qlick bookings yet. When some
 * exist the caller sends the owner to the import screen to review them.
 */
export async function syncGoogleNow(locale: string): Promise<SyncNowResult> {
  const ctx = await requireManagedBusiness();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!gcalConfigured()) return { ok: false, error: "gcal_not_configured" };

  const counts = await pushAllFutureBookings(ctx.bizId);
  const unregistered = await countUnregisteredEvents(ctx.bizId);
  revalidateDash(locale);
  return {
    ok: true,
    pushed: counts.created + counts.updated + counts.deleted,
    unregistered,
  };
}

export async function disconnectGoogle(
  locale: string,
  connectionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  await removeConnection(connectionId);
  revalidateDash(locale);
  return { ok: true };
}
