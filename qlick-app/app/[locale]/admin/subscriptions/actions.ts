"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function extendTrial(
  locale: string,
  businessId: string,
  days: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_trial", {
    p_business: businessId,
    p_days: days,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/subscriptions`);
  revalidatePath(`/${locale}/admin/businesses`);
  return { ok: true };
}

/**
 * Grant or revoke complimentary ("granted") access — lifts the free-plan limits
 * and trial lock without it counting as a paying subscription.
 * `until`: null revokes, "infinity" is indefinite, an ISO timestamp grants until then.
 */
export async function setComp(
  locale: string,
  businessId: string,
  until: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_comp", {
    p_business: businessId,
    p_until: until,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/subscriptions`);
  revalidatePath(`/${locale}/admin/businesses`);
  return { ok: true };
}
