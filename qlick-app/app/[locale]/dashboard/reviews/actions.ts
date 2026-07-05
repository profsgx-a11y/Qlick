"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export interface ReviewModResult {
  ok: boolean;
  error?: string;
}

/** Hide or republish a review. Owner/manager only (enforced by RLS). */
export async function setReviewStatus(
  locale: string,
  reviewId: string,
  status: "published" | "hidden",
): Promise<ReviewModResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${safeLocale}/dashboard/reviews`);
  revalidatePath(`/${safeLocale}/dashboard/staff`);
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
