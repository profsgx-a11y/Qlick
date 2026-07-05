"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  FolderTree,
  UserCog,
  ArrowLeft,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { useMobileNav } from "@/components/dashboard/mobile-nav";

export function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useDict().admin;
  const tc = useDict().dashboard;
  const { open, setOpen } = useMobileNav();
  const base = `/${locale}/admin`;
  const close = () => setOpen(false);

  const items = [
    { href: base, label: t.navOverview, icon: LayoutDashboard, exact: true },
    { href: `${base}/businesses`, label: t.navBusinesses, icon: Store },
    { href: `${base}/users`, label: t.navUsers, icon: Users },
    { href: `${base}/categories`, label: t.navCategories, icon: FolderTree },
    { href: `${base}/settings`, label: t.navAccount, icon: UserCog },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const body = (mobile: boolean) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href={`/${locale}`} onClick={close} className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold">
            {t.badge}
          </span>
        </Link>
        {mobile && (
          <button onClick={close} className="text-muted hover:text-foreground" aria-label={tc.close}>
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-foreground">{t.title}</p>
        <p className="mt-0.5 text-xs text-muted">{t.subtitle}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href={`/${locale}`}
          onClick={close}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t.backToSite}
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-surface/40 md:flex">
        {body(false)}
      </aside>

      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/60" onClick={close} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-surface">
            {body(true)}
          </aside>
        </div>
      )}
    </>
  );
}
