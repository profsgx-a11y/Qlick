"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export interface ClosureResult {
  ok: boolean;
  error?: string;
}

export interface ClosureInput {
  date: string; // "YYYY-MM-DD"
  is_closed: boolean;
  special_open_time: string | null; // "HH:MM" — only when !is_closed
  special_close_time: string | null;
  reason: string | null;
}

/** Trims a free-text reason to null or a capped string. */
const cleanReason = (r: string | null | undefined) => {
  const t = r?.trim() ?? "";
  return t ? t.slice(0, 120) : null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Resolves the caller's business, gated to owner/manager (mirrors saveHours). */
async function requireBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, slug")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return null;
  }
  return biz as { id: string; my_role: string; slug: string | null };
}

function revalidate(locale: string, slug: string | null) {
  revalidatePath(`/${locale}/dashboard/settings`);
  revalidatePath(`/${locale}/dashboard/calendar`);
  if (slug) revalidatePath(`/${locale}/b/${slug}`);
}

/** Validates one closure entry; returns a clean row or an error code. */
function normalize(
  input: ClosureInput,
): { ok: true; row: ClosureInput } | { ok: false; error: string } {
  if (!DATE_RE.test(input.date)) return { ok: false, error: "invalid_date" };
  if (input.is_closed) {
    return {
      ok: true,
      row: {
        date: input.date,
        is_closed: true,
        special_open_time: null,
        special_close_time: null,
        reason: cleanReason(input.reason),
      },
    };
  }
  const open = input.special_open_time?.trim() ?? "";
  const close = input.special_close_time?.trim() ?? "";
  if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
    return { ok: false, error: "invalid_time" };
  }
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  if (toMin(close) <= toMin(open)) return { ok: false, error: "close_before_open" };
  return {
    ok: true,
    row: {
      date: input.date,
      is_closed: false,
      special_open_time: open,
      special_close_time: close,
      reason: cleanReason(input.reason),
    },
  };
}

/**
 * Adds or updates a single closure / special-hours day. Owner/manager only.
 * Upserts on (business_id, date) so re-saving the same date overwrites it.
 */
export async function saveClosure(
  locale: string,
  input: ClosureInput,
): Promise<ClosureResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const biz = await requireBusiness(supabase);
  if (!biz) return { ok: false, error: "no_permission" };

  const norm = normalize(input);
  if (!norm.ok) return { ok: false, error: norm.error };

  const { error } = await supabase
    .from("business_closures")
    .upsert({ business_id: biz.id, ...norm.row }, { onConflict: "business_id,date" });
  if (error) return { ok: false, error: "save_failed" };

  revalidate(safeLocale, biz.slug);
  return { ok: true };
}

/** Removes a closure for a given date. Owner/manager only. */
export async function deleteClosure(
  locale: string,
  date: string,
): Promise<ClosureResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  if (!DATE_RE.test(date)) return { ok: false, error: "invalid_date" };
  const supabase = await createClient();
  const biz = await requireBusiness(supabase);
  if (!biz) return { ok: false, error: "no_permission" };

  const { error } = await supabase
    .from("business_closures")
    .delete()
    .eq("business_id", biz.id)
    .eq("date", date);
  if (error) return { ok: false, error: "save_failed" };

  revalidate(safeLocale, biz.slug);
  return { ok: true };
}

/**
 * Bulk-adds several closed days (the "add Greek holidays" preset). Existing
 * dates are overwritten as full-day closures. Owner/manager only.
 */
export async function addClosedDays(
  locale: string,
  days: { date: string; reason: string | null }[],
): Promise<ClosureResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const biz = await requireBusiness(supabase);
  if (!biz) return { ok: false, error: "no_permission" };

  // De-dupe by date, keeping the first reason seen.
  const byDate = new Map<string, string | null>();
  for (const d of days) {
    if (DATE_RE.test(d.date) && !byDate.has(d.date)) {
      byDate.set(d.date, cleanReason(d.reason));
    }
  }
  if (byDate.size === 0) return { ok: false, error: "invalid_date" };

  const rows = Array.from(byDate, ([date, reason]) => ({
    business_id: biz.id,
    date,
    is_closed: true,
    special_open_time: null,
    special_close_time: null,
    reason,
  }));
  const { error } = await supabase
    .from("business_closures")
    .upsert(rows, { onConflict: "business_id,date" });
  if (error) return { ok: false, error: "save_failed" };

  revalidate(safeLocale, biz.slug);
  return { ok: true };
}
