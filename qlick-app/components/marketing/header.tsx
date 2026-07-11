import Link from "next/link";
import { Store, LogOut } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "./language-switcher";
import type { Locale, Dictionary } from "@/i18n/config";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

export async function Header({ locale, dict }: HeaderProps) {
  // Auth-aware actions: signed-in visitors see their account / dashboard
  // instead of login + free-trial CTAs.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let ownsBusiness = false;
  if (user) {
    const { data: biz } = await supabase
      .from("my_businesses")
      .select("id")
      .limit(1);
    ownsBusiness = (biz?.length ?? 0) > 0;
  }

  const navItems = [
    { href: `/${locale}/tour`, label: dict.nav.features },
    { href: `/${locale}#pricing`, label: dict.nav.pricing },
    { href: `/${locale}/for-business`, label: dict.nav.forBusiness },
    { href: `/${locale}/search`, label: dict.nav.findBusinesses },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageSwitcher current={locale} />
            {user ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground md:inline"
                >
                  {dict.nav.account}
                </Link>
                {ownsBusiness && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${locale}/dashboard`}>
                      <Store className="size-4" />
                      <span className="hidden sm:inline">
                        {dict.nav.myBusiness}
                      </span>
                    </Link>
                  </Button>
                )}
                <form action={`/${locale}/auth/logout`} method="post">
                  <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="size-4 sm:hidden" />
                    <span className="hidden sm:inline">{dict.nav.logout}</span>
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  {dict.nav.login}
                </Link>
                <Button asChild size="sm">
                  <Link href={`/${locale}/signup`}>{dict.nav.signupCta}</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile: primary nav on its own row under the top bar. */}
        <nav className="flex items-center justify-between gap-3 overflow-x-auto pb-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[13px] font-medium text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
