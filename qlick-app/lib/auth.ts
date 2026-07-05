import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export type AccountType = "customer" | "business";

/** Landing page for a given account type after login. */
export function roleHome(locale: string, accountType: AccountType): string {
  const safe = hasLocale(locale) ? locale : "el";
  return accountType === "business"
    ? `/${safe}/dashboard`
    : `/${safe}/account`;
}

/** Reads the signed-in user's account_type (defaults to "customer"). */
export async function getAccountType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<AccountType> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return data?.account_type === "business" ? "business" : "customer";
}

/**
 * Post-login landing page: platform admins go to /admin, otherwise the normal
 * role home (business → /dashboard, customer → /account).
 */
export async function userHome(
  supabase: Awaited<ReturnType<typeof createClient>>,
  locale: string,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type, is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (data?.is_admin) {
    return `/${hasLocale(locale) ? locale : "el"}/admin`;
  }
  return roleHome(
    locale,
    data?.account_type === "business" ? "business" : "customer",
  );
}
