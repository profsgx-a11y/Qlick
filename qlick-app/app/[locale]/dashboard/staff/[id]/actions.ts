"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export interface ScheduleResult {
  ok: boolean;
  error?: string;
}
export interface TimeOffResult {
  ok: boolean;
  error?: string;
  id?: string;
  warningCount?: number;
}

type SB = Awaited<ReturnType<typeof createClient>>;

/** Returns the business id when the signed-in user owns/manages this staff's business. */
async function ownerBusinessOf(
  supabase: SB,
  staffId: string,
): Promise<string | null> {
  const { data: st } = await supabase
    .from("staff")
    .select("business_id")
    .eq("id", staffId)
    .maybeSingle();
  if (!st?.business_id) return null;
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .eq("id", st.business_id)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager"))
    return null;
  return st.business_id;
}

export interface StaffWindow {
  day_of_week: number;
  open_time: string;
  close_time: string;
}

/** Replace a staff's custom weekly hours. Empty array = inherit business hours. */
export async function saveStaffHours(
  locale: string,
  staffId: string,
  windows: StaffWindow[],
): Promise<ScheduleResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  if (!(await ownerBusinessOf(supabase, staffId)))
    return { ok: false, error: "no_permission" };

  const { error: delErr } = await supabase
    .from("staff_hours")
    .delete()
    .eq("staff_id", staffId);
  if (delErr) return { ok: false, error: "save_failed" };

  if (windows.length > 0) {
    const perDay: Record<number, number> = {};
    const rows = [...windows]
      .sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.open_time.localeCompare(b.open_time),
      )
      .map((w) => {
        const idx = (perDay[w.day_of_week] = (perDay[w.day_of_week] ?? -1) + 1);
        return {
          staff_id: staffId,
          day_of_week: w.day_of_week,
          open_time: w.open_time,
          close_time: w.close_time,
          order_index: idx,
        };
      });
    const { error: insErr } = await supabase.from("staff_hours").insert(rows);
    if (insErr) return { ok: false, error: "save_failed" };
  }

  revalidatePath(`/${safeLocale}/dashboard/staff/${staffId}`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}

export async function addTimeOff(
  locale: string,
  staffId: string,
  type: string,
  startsAtIso: string,
  endsAtIso: string,
  reason: string,
): Promise<TimeOffResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const businessId = await ownerBusinessOf(supabase, staffId);
  if (!businessId) return { ok: false, error: "no_permission" };

  const safeType = ["repo", "leave", "sick", "unpaid"].includes(type)
    ? type
    : "leave";
  if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime())
    return { ok: false, error: "invalid_interval" };

  const { data: created, error } = await supabase
    .from("staff_time_off")
    .insert({
      staff_id: staffId,
      business_id: businessId,
      type: safeType,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      reason: reason.trim() || null,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "save_failed" };

  // Warn (don't block) if bookings already exist in this interval.
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("starts_at", endsAtIso)
    .gt("ends_at", startsAtIso);

  revalidatePath(`/${safeLocale}/dashboard/staff/${staffId}`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return {
    ok: true,
    id: created.id,
    warningCount: count && count > 0 ? count : undefined,
  };
}

export async function deleteTimeOff(
  locale: string,
  staffId: string,
  id: string,
): Promise<ScheduleResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  if (!(await ownerBusinessOf(supabase, staffId)))
    return { ok: false, error: "no_permission" };
  const { error } = await supabase
    .from("staff_time_off")
    .delete()
    .eq("id", id)
    .eq("staff_id", staffId);
  if (error) return { ok: false, error: "save_failed" };
  revalidatePath(`/${safeLocale}/dashboard/staff/${staffId}`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}
