import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  UserX,
  Wallet,
  BarChart3,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { CountUp } from "@/components/motion/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { requireBusiness } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NoShowReport, type NoShowAccount } from "./no-show-report";

type Range = "30d" | "month" | "year";

function rangeStart(range: Range): Date {
  const now = new Date();
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1); // month
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dash = (await getDictionary(locale)).dashboard;
  const t = dash.reports;
  const RANGE_LABEL: Record<Range, string> = {
    "30d": t.range30d,
    month: t.rangeMonth,
    year: t.rangeYear,
  };
  const SOURCE_LABEL: Record<string, string> = {
    web: t.sourceWeb,
    qr: t.sourceQr,
    dashboard: t.sourceDashboard,
    phone: t.sourcePhone,
  };
  const { business, fullName, email, userId } = await requireBusiness(locale);
  const sp = await searchParams;
  const range: Range =
    sp.range === "30d" || sp.range === "year" ? sp.range : "month";

  const supabase = await createClient();
  const fromIso = rangeStart(range).toISOString();

  const [{ data: bookings }, { data: staffRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("status, source, price_cents, service_name, staff_id, starts_at")
      .eq("business_id", business.id)
      .gte("starts_at", fromIso),
    supabase.from("staff").select("id, name").eq("business_id", business.id),
  ]);

  const rows = bookings ?? [];
  const staffName = new Map((staffRows ?? []).map((s) => [s.id, s.name]));

  const total = rows.length;
  const completed = rows.filter((b) => b.status === "completed");
  const cancelled = rows.filter((b) => b.status === "cancelled").length;
  const noShow = rows.filter((b) => b.status === "no_show").length;
  const revenue = completed.reduce((s, b) => s + (b.price_cents ?? 0), 0);
  const resolved = completed.length + noShow;
  const noShowRate = resolved > 0 ? Math.round((noShow / resolved) * 100) : 0;

  // Source breakdown (all bookings in range).
  const bySource = new Map<string, number>();
  for (const b of rows) bySource.set(b.source, (bySource.get(b.source) ?? 0) + 1);
  const sources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]);
  const sourceMax = Math.max(1, ...sources.map(([, c]) => c));

  // Top services & staff (completed bookings).
  const countMap = (key: (b: (typeof rows)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const b of completed) {
      const k = key(b);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  };
  const topServices = countMap((b) => b.service_name);
  const topStaff = countMap((b) =>
    b.staff_id ? (staffName.get(b.staff_id) ?? null) : t.unassigned,
  );

  // All-time no-show accounts (most recent first) + current blocks, for the report.
  const [{ data: nsRows }, { data: blkRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("customer_id, customer_name, customer_phone, starts_at")
      .eq("business_id", business.id)
      .eq("status", "no_show")
      .order("starts_at", { ascending: false }),
    supabase
      .from("business_blocked_customers")
      .select("customer_id")
      .eq("business_id", business.id),
  ]);
  const blockedSet = new Set((blkRows ?? []).map((b) => b.customer_id));
  const acctMap = new Map<string, NoShowAccount>();
  for (const r of nsRows ?? []) {
    // Skip the owner's own walk-in bookings (no external account to act on).
    if (!r.customer_id || r.customer_id === userId) continue;
    const ex = acctMap.get(r.customer_id);
    if (ex) ex.count += 1;
    else
      acctMap.set(r.customer_id, {
        customerId: r.customer_id,
        name: r.customer_name ?? t.customerFallback,
        phone: r.customer_phone ?? null,
        count: 1,
        lastIso: r.starts_at,
        blocked: blockedSet.has(r.customer_id),
      });
  }
  const noShowAccounts = Array.from(acctMap.values());

  return (
    <>
      <Topbar
        locale={locale}
        title={dash.navReports}
        subtitle={t.subtitle}
        userLabel={fullName || email || ""}
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Period tabs + no-show report */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
            {(["month", "30d", "year"] as Range[]).map((r) => (
              <Link
                key={r}
                href={`/${locale}/dashboard/reports?range=${r}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97]",
                  range === r
                    ? "bg-gold/15 text-gold ring-1 ring-inset ring-gold/25 [box-shadow:var(--glow-nav)]"
                    : "text-muted hover:bg-gold/5 hover:text-foreground",
                )}
              >
                {RANGE_LABEL[r]}
              </Link>
            ))}
          </div>
          <NoShowReport locale={locale} accounts={noShowAccounts} />
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            index={0}
            icon={Wallet}
            label={t.revenue}
            value={formatPrice(revenue, locale)}
            hint={t.completedN.replace("{n}", String(completed.length))}
          />
          <Metric
            index={1}
            icon={CalendarDays}
            label={t.totalBookings}
            value={String(total)}
          />
          <Metric
            index={2}
            icon={UserX}
            label={t.noShows}
            value={`${noShowRate}%`}
            hint={t.noShowHint.replace("{n}", String(noShow))}
          />
          <Metric
            index={3}
            icon={XCircle}
            label={t.cancellations}
            value={String(cancelled)}
          />
        </div>

        {total === 0 ? (
          <EmptyState icon={<BarChart3 />} message={t.noBookings} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Source breakdown */}
            <Panel title={t.sourceTitle} index={0}>
              <div className="space-y-3">
                {sources.map(([src, count]) => (
                  <div key={src}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {SOURCE_LABEL[src] ?? src}
                      </span>
                      <span className="text-muted">
                        {count} ({Math.round((count / total) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-gold [box-shadow:0_0_10px_-2px_var(--gold-glow)]"
                        style={{ width: `${(count / sourceMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Top services */}
            <Panel title={t.topServices} index={1}>
              <RankList rows={topServices} emptyText={t.noCompleted} />
            </Panel>

            {/* Top staff */}
            <Panel title={t.bookingsPerStaff} index={2}>
              <RankList rows={topStaff} emptyText={t.noCompleted} />
            </Panel>

            {/* Status summary */}
            <Panel title={t.summary} index={3}>
              <div className="space-y-2 text-sm">
                <Row
                  icon={CheckCircle2}
                  label={t.completed}
                  value={completed.length}
                />
                <Row icon={UserX} label={t.didNotShow} value={noShow} />
                <Row icon={XCircle} label={t.cancelled} value={cancelled} />
              </div>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  index?: number;
}) {
  // Double-bezel stat card (matches the Overview): a top-lit tray with a gold
  // hairline edge + hover glow, wrapping a recessed inner core.
  // Plain integers get a count-up entrance; formatted values (prices, rates) render as-is.
  const numeric = /^\d+$/.test(value) ? parseInt(value, 10) : null;
  return (
    <div
      className="group relative animate-rise overflow-hidden rounded-[1.4rem] surface-raise p-1.5 [box-shadow:var(--shadow-card-gold)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:[box-shadow:var(--shadow-card-gold-hover)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-[var(--ease-out)] group-hover:opacity-100"
      />
      <div className="relative rounded-[1.05rem] border border-white/5 bg-background/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {label}
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-110">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-4 font-display text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {numeric !== null ? <CountUp to={numeric} duration={1} /> : value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  index = 0,
}: {
  title: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <div
      className="animate-rise rounded-2xl border border-border bg-surface p-5 elev-card"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
        {title}
      </h3>
      {children}
    </div>
  );
}

function RankList({
  rows,
  emptyText,
}: {
  rows: [string, number][];
  emptyText: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{emptyText}</p>;
  const max = Math.max(1, ...rows.map(([, c]) => c));
  return (
    <div className="space-y-3">
      {rows.map(([name, count]) => (
        <div key={name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{name}</span>
            <span className="shrink-0 pl-2 text-muted">{count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gold/70"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-muted">
        <Icon className="size-4 text-gold" />
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
