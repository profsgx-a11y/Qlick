import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";
import { createClient } from "@/lib/supabase/server";
import { SignupWizard } from "./wizard";

export default async function SignupBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].signup;
  const social = authDict[loc].social;
  const days = authDict[loc].days;

  const supabase = await createClient();

  // Is the user already authenticated (e.g. just signed in with Google)?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Already own a business? Skip the wizard — go straight to the dashboard
  // (prevents creating a duplicate business).
  if (user) {
    const { data: owned } = await supabase
      .from("my_businesses")
      .select("id")
      .limit(1);
    if ((owned?.length ?? 0) > 0) redirect(`/${loc}/dashboard`);
  }

  // Fetch categories with parent grouping
  const { data: rows } = await supabase
    .from("categories")
    .select("id, slug, name_el, name_en, parent_id, order_index")
    .order("order_index");

  const all = rows ?? [];
  const parents = new Map(
    all
      .filter((c) => c.parent_id === null)
      .map((c) => [c.id, loc === "el" ? c.name_el : c.name_en]),
  );

  const categories = all
    .filter((c) => c.parent_id !== null)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: loc === "el" ? c.name_el : c.name_en,
      group: parents.get(c.parent_id!) ?? "—",
    }));

  return (
    <Card className="w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isAuthenticated
            ? "Πες μας λίγα για το κατάστημά σου."
            : dict.subtitle}
        </p>
      </div>

      <SignupWizard
        locale={loc}
        dict={dict}
        social={social}
        days={days}
        strength={authDict[loc].passwordStrength}
        categories={categories}
        isAuthenticated={isAuthenticated}
        userEmail={user?.email ?? ""}
      />
    </Card>
  );
}
