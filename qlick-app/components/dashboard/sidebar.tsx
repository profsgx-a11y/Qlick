"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Scissors,
  Users,
  UserCog,
  QrCode,
  BarChart3,
  Star,
  Settings,
  ExternalLink,
  CalendarCheck,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { useMobileNav } from "@/components/dashboard/mobile-nav";

interface SidebarProps {
  locale: string;
  businessName: string;
  businessSlug: string;
  businessStatus: string;
}

export function Sidebar({
  locale,
  businessName,
  businessSlug,
  businessStatus,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useDict().dashboard;
  const { open, setOpen } = useMobileNav();
  const base = `/${locale}/dashboard`;
  const close = () => setOpen(false);

  const items = [
    { href: `${base}/calendar`, label: t.navCalendar, icon: CalendarDays },
    { href: `${base}/services`, label: t.navServices, icon: Scissors },
    { href: `${base}/bookings`, label: t.navBookings, icon: Users },
    { href: `${base}/staff`, label: t.navStaff, icon: UserCog },
    { href: `${base}/qr`, label: t.navQr, icon: QrCode },
    { href: `${base}/reviews`, label: t.navReviews, icon: Star },
    { href: `${base}/reports`, label: t.navReports, icon: BarChart3 },
    { href: `${base}/settings`, label: t.navSettings, icon: Settings },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Shared inner content for both the desktop column and the mobile drawer.
  const body = (mobile: boolean) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href={`/${locale}`} onClick={close}>
          <Logo />
        </Link>
        {mobile && (
          <button
            onClick={close}
            className="text-muted hover:text-foreground"
            aria-label={t.close}
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Business summary */}
      <div className="border-b border-border px-5 py-4">
        <p className="truncate text-sm font-semibold text-foreground">
          {businessName}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              businessStatus === "active"
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                businessStatus === "active" ? "bg-success" : "bg-warning",
              )}
            />
            {businessStatus === "active" ? t.active : t.draft}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item, i) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${i * 45}ms` }}
              className={cn(
                "group relative flex animate-rise items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5",
                active
                  ? "bg-gold/10 text-gold ring-1 ring-inset ring-gold/25"
                  : "text-muted hover:bg-gold/5 hover:text-foreground hover:[box-shadow:var(--glow-nav)]",
              )}
            >
              {/* Active indicator — a small glowing gold bar on the left edge */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold transition-opacity duration-200 ease-[var(--ease-out)] [box-shadow:0_0_12px_var(--gold-glow)]",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <item.icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active
                    ? "text-gold"
                    : "text-muted-2 group-hover:text-gold",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Personal / public links */}
      <div className="space-y-1 border-t border-border p-3">
        <Link
          href={`/${locale}/account`}
          onClick={close}
          className="flex animate-rise items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted transition-[color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-gold/5 hover:text-foreground hover:[box-shadow:var(--glow-nav)]"
        >
          <CalendarCheck className="size-3.5" />
          {t.myBookings}
        </Link>
        <a
          href={`/${locale}/b/${businessSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="flex animate-rise items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted transition-[color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-gold/5 hover:text-foreground hover:[box-shadow:var(--glow-nav)]"
        >
          <ExternalLink className="size-3.5" />
          {t.viewPublic}
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: permanent sidebar column */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-surface/40 md:flex">
        {body(false)}
      </aside>

      {/* Mobile: drawer — only mounted while open, so it can never overlay
          content (or block taps) when closed. */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={close}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-surface">
            {body(true)}
          </aside>
        </div>
      )}
    </>
  );
}
