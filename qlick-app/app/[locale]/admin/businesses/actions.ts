"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; error?: string };

export async function setBusinessStatus(
  locale: string,
  businessId: string,
  status: string,
): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_business_status", {
    p_business: businessId,
    p_status: status,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/businesses`);
  return { ok: true };
}

export async function deleteBusiness(
  locale: string,
  businessId: string,
): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_business", {
    p_business: businessId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/businesses`);
  return { ok: true };
}
