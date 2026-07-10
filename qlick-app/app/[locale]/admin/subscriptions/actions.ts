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
