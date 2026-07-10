"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setUserSuspended(
  locale: string,
  userId: string,
  suspended: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspended", {
    p_user: userId,
    p_suspended: suspended,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}

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

export async function confirmUserEmail(
  locale: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_confirm_user_email", {
    p_user: userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}
