"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteUser(
  locale: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}
