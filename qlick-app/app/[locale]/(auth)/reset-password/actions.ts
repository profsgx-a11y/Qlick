"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { isValidPassword } from "@/lib/validation";
import { userHome } from "@/lib/auth";

export interface ResetResult {
  ok: boolean;
  error?: "too_short" | "no_session" | "failed";
}

/**
 * Sets the new password for the recovery session established by the reset
 * link, then sends the user to their home (account or dashboard).
 */
export async function updatePassword(
  locale: string,
  password: string,
): Promise<ResetResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  if (!isValidPassword(password)) return { ok: false, error: "too_short" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no_session" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: "failed" };

  redirect(await userHome(supabase, safeLocale, user.id));
}
