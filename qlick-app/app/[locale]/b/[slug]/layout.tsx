import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, type Locale } from "@/i18n/config";

/**
 * Shared chrome for the public business pages (`/b/[slug]` and its booking
 * flow): our brand, a language switcher, and auth-aware actions for the
 * customer (sign in / create account, or their account + log out).
 */
export default async function PublicBusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const isEl = loc === "el";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <Container size="lg">
          <div className="flex h-16 items-center justify-between">
            <Link href={`/${loc}`} className="flex items-center">
              <Logo />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher current={loc} />
              {user ? (
                <>
                  <Link
                    href={`/${loc}/account`}
                    className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline"
                  >
                    {isEl ? "Ο λογαριασμός μου" : "My account"}
                  </Link>
                  <form action={`/${loc}/auth/logout`} method="post">
                    <Button type="submit" variant="ghost" size="sm">
                      {isEl ? "Αποσύνδεση" : "Log out"}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href={`/${loc}/login`}
                    className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline"
                  >
                    {isEl ? "Σύνδεση" : "Log in"}
                  </Link>
                  <Button asChild size="sm">
                    <Link href={`/${loc}/signup`}>
                      {isEl ? "Δημιουργία λογαριασμού" : "Create account"}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Container>
      </header>

      {children}
    </div>
  );
}
