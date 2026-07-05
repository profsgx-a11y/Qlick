import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface DashboardContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  accountType: "customer" | "business";
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    role: string;
  } | null;
}

/**
 * Loads the signed-in user and their primary business for dashboard pages.
 * Redirects to /login when unauthenticated, or to the business signup
 * wizard when the user has no business yet.
 */
export async function requireBusiness(locale: string): Promise<
  DashboardContext & { business: NonNullable<DashboardContext["business"]> }
> {
  const ctx = await loadDashboardContext(locale);
  if (!ctx.business) {
    // Customer accounts have no business dashboard — send them to their area.
    // A business account without a business row = signup not finished yet.
    redirect(
      ctx.accountType === "business"
        ? `/${locale}/signup/business`
        : `/${locale}/account`,
    );
  }
  return ctx as DashboardContext & {
    business: NonNullable<DashboardContext["business"]>;
  };
}

export async function loadDashboardContext(
  locale: string,
): Promise<DashboardContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [{ data: profile }, { data: businesses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, account_type")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("my_businesses")
      // Deterministic pick: active before draft (alphabetical), then oldest first,
      // so an accidental extra business never hides the real one.
      .select("id, name, slug, status, my_role")
      .order("status", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const b = businesses?.[0];

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName:
      [profile?.first_name, profile?.last_name]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(" ") || null,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    accountType: profile?.account_type === "business" ? "business" : "customer",
    business: b
      ? {
          id: b.id!,
          name: b.name!,
          slug: b.slug!,
          status: b.status!,
          role: b.my_role!,
        }
      : null,
  };
}
