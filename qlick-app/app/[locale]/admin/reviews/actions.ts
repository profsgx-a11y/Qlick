"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; error?: string };

export async function setReviewStatus(
  locale: string,
  reviewId: string,
  status: "published" | "hidden",
): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_review_status", {
    p_review: reviewId,
    p_status: status,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/reviews`);
  return { ok: true };
}

export async function deleteReview(
  locale: string,
  reviewId: string,
): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_review", {
    p_review: reviewId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/reviews`);
  return { ok: true };
}
