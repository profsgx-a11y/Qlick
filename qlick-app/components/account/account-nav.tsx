"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Heart, Search, Star, User, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { useMobileNav } from "@/components/dashboard/mobile-nav";

function useAccountTabs(locale: string) {
  const d = useDict().account;
  const base = `/${locale}/account`;
  const tabs = [
    { href: base, label: d.navBookings, icon: CalendarCheck },
    { href: `${base}/search`, label: d.navSearch, icon: Search },
    { href: `${base}/favorites`, label: d.navFavorites, icon: Heart },
    { href: `${base}/reviews`, label: d.navReviews, icon: Star },
    { href: `${base}/profile`, label: d.navProfile, icon: User },
  ];
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href);
  const current = tabs.find((t) => isActive(t.href)) ?? tabs[0];
  return { tabs, isActive, current };
}

/**
 * Left side of the account top bar — mirrors the dashboard Topbar:
 * a hamburger (mobile) that opens the section drawer, next to the current
 * section title + "My account" subtitle. On desktop it shows the brand logo
 * instead (the horizontal tabs handle navigation there).
 */
export function AccountMenuButton({ locale }: { locale: string }) {
  const d = useDict().account;
  const { setOpen } = useMobileNav();
  const { current } = useAccountTabs(locale);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        onClick={() => setOpen(true)}
        aria-label={d.openMenu}
        className="-ml-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </button>
      <div className="min-w-0 md:hidden">
        <p className="truncate font-display text-base font-bold leading-tight text-foreground">
          {current.label}
        </p>
        <p className="truncate text-xs text-muted">{d.title}</p>
      </div>
      <Link href={`/${locale}`} className="hidden md:flex">
        <Logo />
      </Link>
    </div>
  );
}

export function AccountNav({ locale }: { locale: string }) {
  const d = useDict().account;
  const { open, setOpen } = useMobileNav();
  const { tabs, isActive } = useAccountTabs(locale);

  return (
    <>
      {/* Desktop: horizontal tabs */}
      <nav className="hidden flex-wrap gap-1 border-b border-border md:flex">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-gold text-gold"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer — opened by the hamburger in the top bar. Mounted only
          while open, so it can never overlay/block taps when closed. */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label={d.close}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="border-b border-border px-5 py-4">
              <p className="truncate text-sm font-semibold text-foreground">
                {d.title}
              </p>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {tabs.map((t) => {
                const active = isActive(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-gold/15 text-gold"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <t.icon className="size-4" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
