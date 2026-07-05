"use server";

import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { isValidEmail } from "@/lib/validation";

export interface ForgotResult {
  ok: boolean;
}

/**
 * Sends the password-reset email. Always reports success so the form never
 * reveals whether an account exists for the given address.
 */
export async function sendPasswordReset(
  locale: string,
  email: string,
): Promise<ForgotResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const value = email.trim();
  if (!isValidEmail(value)) return { ok: true };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  // The recovery link lands on the auth callback, which exchanges the code for
  // a session and then forwards to the reset-password page.
  await supabase.auth.resetPasswordForEmail(value, {
    redirectTo: `${site}/${safeLocale}/auth/callback?next=/${safeLocale}/reset-password`,
  });

  return { ok: true };
}
