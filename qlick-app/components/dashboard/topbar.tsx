"use client";

import Link from "next/link";
import { UserCircle, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { useDict } from "@/i18n/provider";
import { useMobileNav } from "@/components/dashboard/mobile-nav";
import type { Locale } from "@/i18n/config";

interface TopbarProps {
  locale: string;
  title: string;
  subtitle?: string;
  userLabel: string;
  action?: React.ReactNode;
}

export function Topbar({
  locale,
  title,
  subtitle,
  userLabel,
  action,
}: TopbarProps) {
  const t = useDict().dashboard;
  const { setOpen } = useMobileNav();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/70 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={() => setOpen(true)}
          className="-ml-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
          aria-label={t.openMenu}
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {action}
        <LanguageSwitcher current={locale as Locale} />
        <Link
          href={`/${locale}/account/profile`}
          className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground lg:inline"
          title="Ρυθμίσεις προφίλ"
        >
          {userLabel}
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/account`}>
            <UserCircle className="size-4" />
            <span className="hidden lg:inline">{t.manageAccount}</span>
          </Link>
        </Button>
        <form action={`/${locale}/auth/logout`} method="post">
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4 lg:hidden" />
            <span className="hidden lg:inline">{t.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
