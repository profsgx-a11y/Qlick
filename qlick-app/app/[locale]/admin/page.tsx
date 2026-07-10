import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Store,
  Users,
  CalendarDays,
  UserPlus,
  Gift,
  CreditCard,
  Trophy,
  MoonStar,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { WeeklyBars, SourceBars } from "@/components/admin/overview-charts";

interface BookingStats {
  sources_total: Record<string, number>;
  sources_30d: Record<string, number>;
  weekly: { week_start: string; bookings: number; signups: number }[];
  top_businesses_30d: { id: string; name: string; slug: string; count: number }[];
  dormant_count: number;
  dormant: { id: string; name: string; slug: string; last_booking_at: string | null }[];
  cancelled_30d: number;
  no_show_30d: number;
}

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);
  const t = dict.admin.overview;

  const supabase = await createClient();
  const [{ data }, { data: statsData }] = await Promise.all([
    supabase.rpc("admin_overview_stats"),
    supabase.rpc("admin_booking_stats"),
  ]);
  const s = (data ?? {}) as Record<string, number>;
  const n = (k: string) => Number(s[k] ?? 0);
  const stats = (statsData ?? {
    sources_total: {},
    sources_30d: {},
    weekly: [],
    top_businesses_30d: [],
    dormant_count: 0,
    dormant: [],
    cancelled_30d: 0,
    no_show_30d: 0,
  }) as unknown as BookingStats;

  const fmtEuro = (cents: number) =>
    `${(cents / 100).toFixed(2).replace(/\.00$/, "")} €`;
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB")
      : null;

  const sourceItems = (
    [
      { key: "qr", label: t.sourceQr, highlight: true },
      { key: "web", label: t.sourceWeb },
      { key: "dashboard", label: t.sourceDashboard },
      { key: "phone", label: t.sourcePhone },
    ] as const
  ).map((it) => ({
    ...it,
    last30: Number(stats.sources_30d?.[it.key] ?? 0),
    total: Number(stats.sources_total?.[it.key] ?? 0),
  }));

  const weekly = stats.weekly ?? [];

  return (
    <>
      <Topbar
        locale={locale}
        title={t.title}
        subtitle={t.subtitle}
        userLabel={name || email || ""}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Free-slots highlight */}
        <div className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <Gift className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-bold text-foreground">{n("free_slots_left")}</p>
            <p className="text-sm text-muted">
              {t.freeSlots} · {t.freeSlotsHint}
            </p>
          </div>
        </div>

        {/* Businesses */}
        <Group icon={<Store className="size-4" />} label={t.businesses}>
          <Stat label={t.businesses} value={n("businesses_total")} big />
          <Stat label={t.active} value={n("businesses_active")} tone="success" />
          <Stat label={t.draft} value={n("businesses_draft")} tone="warning" />
          <Stat label={t.suspended} value={n("businesses_suspended")} tone="danger" />
        </Group>

        {/* Subscriptions */}
        <div>
          <Group icon={<CreditCard className="size-4" />} label={t.subsTitle}>
            <Stat label={t.mrr} value={fmtEuro(n("mrr_cents"))} big />
            <Stat label={t.subscribed} value={n("subscribed")} />
            <Stat label={t.inTrial} value={n("in_trial")} tone="success" />
            <Stat
              label={t.expiring7d}
              value={n("trial_expiring_7d")}
              tone={n("trial_expiring_7d") > 0 ? "warning" : undefined}
            />
            <Stat
              label={t.trialExpired}
              value={n("trial_expired")}
              tone={n("trial_expired") > 0 ? "danger" : undefined}
            />
          </Group>
          <p className="mt-2 text-xs text-muted-2">{t.subsNote}</p>
        </div>

        {/* Booking sources + weekly trends */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-2">
            <CalendarDays className="size-4" />
            {t.trendTitle}
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <SourceBars
              title={t.sourcesTitle}
              columns={{ last30: t.sources30d, total: t.sourcesAll }}
              items={sourceItems}
            />
            <WeeklyBars
              title={t.trendBookings}
              locale={locale}
              points={weekly.map((w) => ({ week: w.week_start, value: w.bookings }))}
            />
            <WeeklyBars
              title={t.trendSignups}
              locale={locale}
              points={weekly.map((w) => ({ week: w.week_start, value: w.signups }))}
            />
          </div>
        </section>

        {/* Users */}
        <Group icon={<Users className="size-4" />} label={t.users}>
          <Stat label={t.users} value={n("users_total")} big />
          <Stat label={t.customers} value={n("customers")} />
          <Stat label={t.businessAccounts} value={n("business_accounts")} />
        </Group>

        {/* Activity */}
        <Group icon={<CalendarDays className="size-4" />} label={t.bookings}>
          <Stat label={t.bookings} value={n("bookings_total")} big />
          <Stat label={t.bookings30d} value={n("bookings_30d")} />
          <Stat
            label={t.signups30d}
            value={n("signups_30d")}
            icon={<UserPlus className="size-4" />}
          />
          <Stat
            label={t.cancelled30d}
            value={stats.cancelled_30d}
            tone={stats.cancelled_30d > 0 ? "warning" : undefined}
          />
          <Stat
            label={t.noShow30d}
            value={stats.no_show_30d}
            tone={stats.no_show_30d > 0 ? "danger" : undefined}
          />
        </Group>

        {/* Top + dormant businesses */}
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-2">
              <Trophy className="size-4 text-gold" />
              {t.topTitle}
            </h3>
            {stats.top_businesses_30d.length === 0 ? (
              <p className="text-sm text-muted">{t.topEmpty}</p>
            ) : (
              <ol className="space-y-2">
                {stats.top_businesses_30d.map((b, i) => (
                  <li key={b.id} className="flex items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-gold/15 text-xs font-bold text-gold">
                      {i + 1}
                    </span>
                    <Link
                      href={`/${locale}/admin/businesses/${b.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-gold"
                    >
                      {b.name}
                    </Link>
                    <span className="whitespace-nowrap rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {t.topCount.replace("{n}", String(b.count))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-2">
              <MoonStar className="size-4" />
              {t.dormantTitle}
              {stats.dormant_count > 0 && (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                  {stats.dormant_count}
                </span>
              )}
            </h3>
            <p className="mb-3 text-[11px] text-muted-2">{t.dormantHint}</p>
            {stats.dormant.length === 0 ? (
              <p className="text-sm text-muted">{t.dormantEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {stats.dormant.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/${locale}/admin/businesses/${b.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-gold"
                    >
                      {b.name}
                    </Link>
                    <span className="whitespace-nowrap text-xs text-muted-2">
                      {b.last_booking_at
                        ? t.dormantLastBooking.replace("{d}", fmtDate(b.last_booking_at) ?? "")
                        : t.dormantNever}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Group({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-2">
        {icon}
        {label}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  big?: boolean;
  tone?: "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <p
        className={`mt-2 font-bold ${big ? "text-3xl" : "text-2xl"} ${toneClass} whitespace-nowrap`}
      >
        {value}
      </p>
    </div>
  );
}
