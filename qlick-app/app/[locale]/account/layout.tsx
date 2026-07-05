import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Store, LogOut } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AccountNav, AccountMenuButton } from "@/components/account/account-nav";
import { MobileNavProvider } from "@/components/dashboard/mobile-nav";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary, type Locale } from "@/i18n/config";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.account;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: myBiz }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("my_businesses").select("id").limit(1),
  ]);
  const ownsBusiness = (myBiz?.length ?? 0) > 0;

  return (
    <MobileNavProvider>
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/40 backdrop-blur">
        <Container size="lg">
          <div className="flex h-16 items-center justify-between">
            <AccountMenuButton locale={locale} />
            <div className="flex items-center gap-1.5 sm:gap-3">
              <LanguageSwitcher current={locale as Locale} />
              <Link
                href={`/${locale}/account/profile`}
                className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground lg:inline"
                title={t.profileSettings}
              >
                {[profile?.first_name, profile?.last_name]
                  .map((s) => s?.trim())
                  .filter(Boolean)
                  .join(" ") || user.email}
              </Link>
              {ownsBusiness && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/${locale}/dashboard`}>
                    <Store className="size-4" />
                    <span className="hidden sm:inline">{t.manageBusiness}</span>
                  </Link>
                </Button>
              )}
              <form action={`/${locale}/auth/logout`} method="post">
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">{dict.nav.logout}</span>
                </Button>
              </form>
            </div>
          </div>
        </Container>
      </header>

      <Container size="lg">
        <div className="py-10">
          {/* On mobile the title lives in the AccountNav topbar-style row
              (hamburger + section). Keep the big heading for desktop only. */}
          <h1 className="mb-6 hidden font-display text-3xl font-bold tracking-tight text-foreground md:block">
            {t.title}
          </h1>
          <AccountNav locale={locale} />
          <div className="mt-8">{children}</div>
        </div>
      </Container>
    </div>
    </MobileNavProvider>
  );
}
