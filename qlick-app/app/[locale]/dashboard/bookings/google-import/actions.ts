"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale } from "@/i18n/config";
import { gcalConfigured } from "@/lib/google/calendar";
import {
  listImportableEventsForConnection,
  markEventsAdopted,
} from "@/lib/google/sync";
import type { ImportableEvent } from "@/lib/google/mapping";

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
}

export async function listGoogleImportEvents(
  connectionId: string,
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
  return { ok: true, events: res.events };
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
  input: { serviceId: string; eventIds: string[] },
): Promise<GcalImportResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const ctx = await requireConnection(connectionId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const chosen = new Set(input.eventIds.filter(Boolean));
  if (chosen.size === 0) return { ok: false, error: "gcal_import_failed" };

  const admin = createAdminClient();

  // The service everything is filed under must belong to this business.
  const { data: svc } = await admin
    .from("services")
    .select("id, name, price_cents, business_id")
    .eq("id", input.serviceId)
    .eq("business_id", ctx.bizId)
    .maybeSingle();
  if (!svc) return { ok: false, error: "gcal_import_failed" };

  const listed = await listImportableEventsForConnection(connectionId);
  if (!listed.ok) {
    return {
      ok: false,
      error:
        listed.error === "reconnect_required" ? "gcal_reconnect" : "gcal_api_error",
    };
  }
  const events = listed.events.filter((e) => chosen.has(e.gcalEventId));

  // Events adopted since the preview was loaded count as duplicates.
  const { data: existing } = await admin
    .from("bookings")
    .select("gcal_event_id")
    .eq("business_id", ctx.bizId)
    .in("gcal_event_id", [...chosen])
    .not("gcal_event_id", "is", null);
  const already = new Set((existing ?? []).map((r) => r.gcal_event_id as string));

  const fresh = events.filter((e) => !already.has(e.gcalEventId));
  let imported = 0;
  const adopted: { eventId: string; bookingId: string; businessId: string }[] = [];

  for (const e of fresh) {
    const { data: ins, error } = await admin
      .from("bookings")
      .insert({
        business_id: ctx.bizId,
        customer_id: ctx.userId, // walk-in pattern: the owner "holds" it
        service_id: svc.id,
        service_name: svc.name,
        staff_id: ctx.conn.staff_id,
        starts_at: e.startsAtIso,
        ends_at: e.endsAtIso,
        status: "confirmed",
        source: "gcal",
        no_staff_preference: !ctx.conn.staff_id,
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

  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard`);

  return {
    ok: true,
    imported,
    duplicates: [...chosen].filter((id) => already.has(id)).length,
  };
}
