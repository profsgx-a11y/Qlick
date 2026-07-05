import Link from "next/link";
import { notFound } from "next/navigation";
import {
  QrCode,
  CalendarDays,
  ArrowRight,
  Check,
  Users,
  Euro,
  Image as ImageIcon,
  PartyPopper,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/motion/primitives";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import type { Dictionary } from "@/i18n/shared";
import { formatPrice } from "@/lib/format";
import { todayInZone, dayRangeUtc, buildDayWindow } from "@/lib/calendar";
import {
  dayOfWeekInZone,
  type DayHours,
  type Closure,
} from "@/lib/availability";

export default async function DashboardHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  // Timezone + publish time (drives the "today" widgets and the 48h celebration).
  const { data: biz } = await supabase
    .from("businesses")
    .select("timezone, published_at")
    .eq("id", business.id)
    .maybeSingle();
  const tz = biz?.timezone || "Europe/Athens";

  const todayStr = todayInZone(tz);
  const dow = dayOfWeekInZone(todayStr, tz);
  const { from: dayFrom, to: dayTo } = dayRangeUtc(todayStr, tz);
  const nowMs = Date.now();

  const [
    { count: servicesCount },
    { data: staffRows },
    { data: todayRows },
    { data: hourRows },
    { data: closureRows },
    { data: timeOffRows },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("staff")
      .select("id")
      .eq("business_id", business.id)
      .eq("is_active", true),
    supabase
      .from("bookings")
      .select("starts_at, status, price_cents")
      .eq("business_id", business.id)
      .gte("starts_at", dayFrom.toISOString())
      .lt("starts_at", dayTo.toISOString()),
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", business.id),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", business.id)
      .eq("date", todayStr),
    supabase
      .from("staff_time_off")
      .select("staff_id, starts_at, ends_at")
      .eq("business_id", business.id)
      .lt("starts_at", dayTo.toISOString())
      .gt("ends_at", dayFrom.toISOString()),
  ]);

  const activeStaffIds = (staffRows ?? []).map((s) => s.id);
  const hasStaff = activeStaffIds.length > 0;

  // Per-staff custom weekly hours (only for active staff who have any).
  const staffHoursRows = activeStaffIds.length
    ? (
        await supabase
          .from("staff_hours")
          .select("staff_id, day_of_week")
          .in("staff_id", activeStaffIds)
      ).data ?? []
    : [];

  // --- "Today" metrics ---
  const tRows = todayRows ?? [];
  const todayCount = tRows.filter((b) => b.status !== "cancelled").length;
  const todayRemaining = tRows.filter(
    (b) =>
      (b.status === "pending" || b.status === "confirmed") &&
      new Date(b.starts_at).getTime() >= nowMs,
  ).length;
  const revenueToday = tRows
    .filter(
      (b) =>
        b.status === "pending" ||
        b.status === "confirmed" ||
        b.status === "completed",
    )
    .reduce((sum, b) => sum + (b.price_cents ?? 0), 0);

  // Staff "on shift today": custom-hours staff work if they have a row for today's
  // weekday; everyone else follows the business being open today. Anyone on a
  // full-day time-off is excluded.
  const win = buildDayWindow(
    todayStr,
    tz,
    (hourRows ?? []) as DayHours[],
    (closureRows ?? []) as Closure[],
    [],
  );
  const businessOpenToday = !win.isClosed;
  const customStaff = new Set(staffHoursRows.map((r) => r.staff_id));
  const worksDow = new Set(
    staffHoursRows.filter((r) => r.day_of_week === dow).map((r) => r.staff_id),
  );
  const fullDayOff = new Set(
    (timeOffRows ?? [])
      .filter(
        (o) =>
          new Date(o.starts_at).getTime() <= dayFrom.getTime() &&
          new Date(o.ends_at).getTime() >= dayTo.getTime(),
      )
      .map((o) => o.staff_id),
  );
  let staffToday = 0;
  for (const id of activeStaffIds) {
    if (fullDayOff.has(id)) continue;
    const works = customStaff.has(id) ? worksDow.has(id) : businessOpenToday;
    if (works) staffToday++;
  }

  const hasServices = (servicesCount ?? 0) > 0;
  const published = business.status === "active";
  // Celebrate only for the first 48h after going live.
  const publishedAtMs = biz?.published_at
    ? new Date(biz.published_at).getTime()
    : null;
  const showCelebration =
    published &&
    publishedAtMs != null &&
    nowMs - publishedAtMs <= 48 * 60 * 60 * 1000;
  const base = `/${locale}/dashboard`;

  const steps = [
    {
      done: true,
      label: t.stepCreate,
    },
    {
      done: hasStaff,
      label: t.stepStaff,
      href: `${base}/staff`,
    },
    {
      done: hasServices,
      label: t.stepServices,
      href: `${base}/services`,
    },
    {
      done: published,
      label: t.stepPublish,
    },
  ];

  return (
    <>
      <Topbar
        locale={locale}
        title={t.overview}
        subtitle={business.name}
        userLabel={fullName || email || ""}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {welcome && (
          <Card className="mb-6 border-gold/40 bg-gold/5">
            <h2 className="font-display text-xl font-bold text-foreground">
              {t.welcomeTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.welcomeBody}</p>
          </Card>
        )}

        {/* Today at a glance */}
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          <StatCard
            index={0}
            icon={<CalendarDays className="size-5" />}
            label={t.todayBookings}
            value={String(todayCount)}
            sub={
              todayCount > 0
                ? t.todayRemaining.replace("{n}", String(todayRemaining))
                : t.todayNone
            }
            href={`${base}/bookings`}
          />
          <StatCard
            index={1}
            icon={<Users className="size-5" />}
            label={t.todayStaff}
            value={String(staffToday)}
            sub={t.todayStaffHint}
            href={`${base}/staff`}
          />
          <StatCard
            index={2}
            icon={<Euro className="size-5" />}
            label={t.todayRevenue}
            value={formatPrice(revenueToday, locale)}
            sub={t.todayRevenueHint}
            href={`${base}/reports`}
          />
        </div>

        {/* Onboarding checklist (draft) → celebration (first 48h live) → nothing */}
        {!published ? (
          <Card className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
              {t.gettingStarted}
            </h3>
            <ul className="mt-4 space-y-3">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-3">
                  <span
                    className={
                      step.done
                        ? "grid size-6 place-items-center rounded-full bg-success/20 text-success"
                        : "grid size-6 place-items-center rounded-full border border-border text-muted-2"
                    }
                  >
                    {step.done ? <Check className="size-3.5" /> : ""}
                  </span>
                  <span
                    className={
                      step.done
                        ? "text-sm text-muted line-through"
                        : "text-sm text-foreground"
                    }
                  >
                    {step.label}
                  </span>
                  {!step.done && step.href && (
                    <Link
                      href={step.href}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
                    >
                      {t.go} <ArrowRight className="size-3" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : showCelebration ? (
          <PublishedCard t={t} base={base} />
        ) : null}
      </div>
    </>
  );
}

function PublishedCard({
  t,
  base,
}: {
  t: Dictionary["dashboard"];
  base: string;
}) {
  return (
    <Card className="mt-8 border-success/40 bg-success/5">
      <div className="flex items-center gap-2">
        <PartyPopper className="size-6 text-success" />
        <h3 className="font-display text-xl font-bold text-foreground">
          {t.publishedTitle}
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted">{t.publishedBody}</p>

      <h4 className="mt-6 text-xs font-semibold uppercase tracking-widest text-gold">
        {t.nextStepsTitle}
      </h4>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* Add a business photo */}
        <div className="rounded-lg border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-gold" />
            <h5 className="font-semibold text-foreground">
              {t.nextPhotoTitle}
            </h5>
          </div>
          <p className="mt-2 text-sm text-muted">{t.nextPhotoBody}</p>
          <Link
            href={`${base}/settings`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            {t.nextPhotoCta} <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Issue a QR poster — mini guide */}
        <div className="rounded-lg border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-gold" />
            <h5 className="font-semibold text-foreground">{t.nextQrTitle}</h5>
          </div>
          <p className="mt-2 text-sm text-muted">{t.nextQrBody}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>{t.nextQrStep1}</li>
            <li>{t.nextQrStep2}</li>
            <li>{t.nextQrStep3}</li>
            <li>{t.nextQrStep4}</li>
          </ol>
          <Link
            href={`${base}/qr`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            {t.nextQrCta} <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Calendar: guide, pause online bookings, no-double-booking reassurance */}
        <div className="rounded-lg border border-border bg-surface-2/40 p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-gold" />
            <h5 className="font-semibold text-foreground">{t.nextCalTitle}</h5>
          </div>
          <p className="mt-2 text-sm text-muted">{t.nextCalBody}</p>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-success">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            {t.nextCalReassure}
          </p>
          <Link
            href={`${base}/calendar`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            {t.nextCalCta} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  index?: number;
}) {
  // Plain integers get a count-up entrance; formatted values (prices) render as-is.
  const numeric = /^\d+$/.test(value) ? parseInt(value, 10) : null;
  const inner = (
    // Outer "tray": top-lit gradient shell with a hairline edge that turns gold
    // on hover, lifting the whole card a notch (Emil's responsive-to-input feel).
    <div
      className="group relative animate-rise overflow-hidden rounded-[1.4rem] surface-raise p-1.5 [box-shadow:var(--shadow-card-gold)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:[box-shadow:var(--shadow-card-gold-hover)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* Decorative gold glow, revealed on hover */}
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-[var(--ease-out)] group-hover:opacity-100"
      />
      {/* Inner recessed core */}
      <div className="relative rounded-[1.05rem] border border-white/5 bg-background/40 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-110">
            {icon}
          </span>
        </div>
        <p className="mt-5 font-display text-4xl font-bold tracking-tight tabular-nums text-foreground">
          {numeric !== null ? <CountUp to={numeric} duration={1} /> : value}
        </p>
        {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
