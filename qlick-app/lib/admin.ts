import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminContext {
  userId: string;
  email: string | null;
  name: string | null;
}

/**
 * Loads the signed-in user and ensures they are a platform admin.
 * Redirects to /login when unauthenticated, or to their normal home when not an
 * admin (so /admin never reveals itself to regular users).
 */
export async function requireAdmin(locale: string): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, is_admin, account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect(
      profile?.account_type === "business"
        ? `/${locale}/dashboard`
        : `/${locale}/account`,
    );
  }

  const name =
    [profile.first_name, profile.last_name]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ") || null;

  return { userId: user.id, email: user.email ?? null, name };
}
