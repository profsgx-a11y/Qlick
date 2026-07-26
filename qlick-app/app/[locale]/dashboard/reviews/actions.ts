"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export interface ReviewModResult {
  ok: boolean;
  error?: string;
}

// Report reasons a business can raise against a review. Keep in sync with the
// DB check constraint on review_reports.report_type, the i18n reportTypes, and
// REVIEW_REPORT_TYPES in reviews-manager.tsx. (A "use server" module may only
// export async functions, so this list is duplicated client-side rather than
// shared from here.)
const REPORT_TYPES = [
  "spam",
  "offensive",
  "irrelevant",
  "false_claims",
  "other",
] as const;

/**
 * Flag a review to the Qlick platform admin for moderation. The review stays
 * public — only the admin can hide or delete it. Owner/manager only (RLS).
 */
export async function reportReview(
  locale: string,
  reviewId: string,
  reportType: string,
  note: string,
): Promise<ReviewModResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  if (!REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
    return { ok: false, error: "invalid_type" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // The review belongs to the owner's business (RLS lets them read it); use its
  // business_id so the report row passes the owner-write policy.
  const { data: review } = await supabase
    .from("reviews")
    .select("business_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review) return { ok: false, error: "not_found" };

  const { error } = await supabase.from("review_reports").insert({
    business_id: review.business_id,
    review_id: reviewId,
    reported_by: user.id,
    report_type: reportType,
    note: note.trim().slice(0, 500) || null,
  });
  if (error) return { ok: false, error: "report_failed" };

  revalidatePath(`/${safeLocale}/dashboard/reviews`);
  return { ok: true };
}

/** Post or clear the business reply to a review. */
export async function replyToReview(
  locale: string,
  reviewId: string,
  reply: string,
): Promise<ReviewModResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ business_reply: reply.trim() || null })
    .eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${safeLocale}/dashboard/reviews`);
  return { ok: true };
}
