import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteButton } from "@/components/account/favorite-button";
import { BookingActions } from "@/components/account/booking-actions";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import type { Dictionary } from "@/i18n/shared";
import { formatDateTime, formatTimeRange, formatPrice } from "@/lib/format";
import { ReviewButton, type ExistingReview } from "./review-button";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).account;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: bookings }, { data: reviews }, { data: favRows }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, business_id, service_id, staff_id, starts_at, ends_at, status, completed_at, service_name, price_cents, staff:staff(name), businesses(name, slug, timezone, address, logo_url)",
        )
        .eq("customer_id", user.id)
        .order("starts_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("booking_id, id, rating, comment, customer_name")
        .eq("customer_id", user.id),
      supabase.from("favorites").select("business_id").eq("customer_id", user.id),
    ]);

  const favSet = new Set((favRows ?? []).map((f) => f.business_id));

  const reviewedMap = new Map<string, ExistingReview>(
    (reviews ?? []).map((r) => [
      r.booking_id,
      {
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment,
        customerName: r.customer_name,
      },
    ]),
  );

  // Server component: rendered once per request, so request-time "now" is correct.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const TERMINAL = new Set(["cancelled", "completed", "no_show"]);
  const isUpcoming = (b: { starts_at: string; status: string }) =>
    new Date(b.starts_at).getTime() >= now && !TERMINAL.has(b.status);

  const upcoming = (bookings ?? [])
    .filter(isUpcoming)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  const past = (bookings ?? [])
    .filter((b) => !isUpcoming(b))
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );

  return (
    <>
      <Section title={t.upcoming} empty={t.noUpcoming}>
        {upcoming.map((b, i) => (
          <BookingCard
            key={b.id}
            index={i}
            booking={b}
            locale={locale}
            t={t}
            existingReview={reviewedMap.get(b.id) ?? null}
            favorited={favSet.has(b.business_id)}
            upcoming
          />
        ))}
      </Section>

      {past.length > 0 && (
        <Section title={t.history} empty="">
          {past.map((b, i) => (
            <BookingCard
              key={b.id}
              index={i}
              booking={b}
              locale={locale}
              t={t}
              existingReview={reviewedMap.get(b.id) ?? null}
              favorited={favSet.has(b.business_id)}
              muted
            />
          ))}
        </Section>
      )}
    </>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
        {title}
      </h2>
      {hasChildren ? (
        <div className="space-y-3">{children}</div>
      ) : empty ? (
        <EmptyState icon={<CalendarDays />} message={empty} />
      ) : null}
    </div>
  );
}

interface BookingCardData {
  id: string;
  business_id: string;
  service_id: string | null;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  completed_at: string | null;
  service_name: string | null;
  price_cents: number;
  staff: { name: string } | null;
  businesses: {
    name: string;
    slug: string;
    timezone: string;
    address: unknown;
    logo_url: string | null;
  } | null;
}

function BookingCard({
  booking,
  locale,
  t,
  existingReview,
  favorited,
  upcoming,
  muted,
  index = 0,
}: {
  booking: BookingCardData;
  locale: string;
  t: Dictionary["account"];
  existingReview: ExistingReview | null;
  favorited: boolean;
  upcoming?: boolean;
  muted?: boolean;
  index?: number;
}) {
  const statusLabels: Record<string, string> = {
    pending: t.statusPending,
    confirmed: t.statusConfirmed,
    completed: t.statusCompleted,
    cancelled: t.statusCancelled,
    no_show: t.statusNoShow,
  };
  const statusCls: Record<string, string> = {
    pending: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
    confirmed: "bg-success/15 text-success ring-1 ring-inset ring-success/25",
    completed: "bg-surface-3 text-muted ring-1 ring-inset ring-border-strong",
    cancelled: "bg-danger/15 text-danger ring-1 ring-inset ring-danger/25",
    no_show: "bg-danger/15 text-danger ring-1 ring-inset ring-danger/25",
  };
  const tz = booking.businesses?.timezone || "Europe/Athens";
  const address = (booking.businesses?.address ?? {}) as {
    city?: string;
    street?: string;
  };
  return (
    <Card
      style={{ animationDelay: `${index * 50}ms` }}
      className={muted ? "group py-4 opacity-70" : "group py-4"}
    >
      {/* Top: logo + business name + service + favorite */}
      <div className="flex items-center gap-3">
        {booking.businesses?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.businesses.logo_url}
            alt={booking.businesses?.name ?? ""}
            className="h-16 w-auto max-w-40 shrink-0 rounded-lg border border-border bg-surface-2 object-contain transition-[box-shadow] duration-300 ease-[var(--ease-out)] group-hover:[box-shadow:var(--glow-nav)]"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-surface-2" />
        )}
        <div className="min-w-0 flex-1">
          {booking.businesses?.slug ? (
            <Link
              href={`/${locale}/b/${booking.businesses.slug}`}
              className="font-semibold text-foreground transition-colors hover:text-gold"
            >
              {booking.businesses.name}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">
              {booking.businesses?.name ?? t.shopFallback}
            </span>
          )}
          <p className="mt-0.5 truncate text-sm text-muted">
            {booking.service_name}
          </p>
        </div>
        <FavoriteButton
          locale={locale}
          businessId={booking.business_id}
          initialFavorited={favorited}
          isAuthed
          variant="icon"
        />
      </div>

      {/* Bottom: date/time/address + status + price */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5 text-gold" />
              {formatDateTime(booking.starts_at, tz, locale)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-gold" />
              {formatTimeRange(booking.starts_at, booking.ends_at, tz, locale)}
            </span>
            {(address.street || address.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-gold" />
                {[address.street, address.city].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls[booking.status] ?? "bg-surface-2 text-muted"}`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {statusLabels[booking.status] ?? booking.status}
            </span>
            <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
              {formatPrice(booking.price_cents, locale)}
            </span>
          </div>
        </div>
      </div>

      {upcoming && (
        <BookingActions
          locale={locale}
          bookingId={booking.id}
          businessId={booking.business_id}
          serviceId={booking.service_id}
          staffId={booking.staff_id}
        />
      )}
      {booking.status === "completed" &&
        (() => {
          // Reviews allowed only within 48h of the owner marking it completed.
          const REVIEW_WINDOW_MS = 48 * 60 * 60 * 1000;
          const completedMs = booking.completed_at
            ? new Date(booking.completed_at).getTime()
            : null;
          const deadlineMs =
            completedMs != null ? completedMs + REVIEW_WINDOW_MS : null;
          // eslint-disable-next-line react-hooks/purity
          const canReview = deadlineMs != null && Date.now() <= deadlineMs;
          return (
            <ReviewButton
              locale={locale}
              bookingId={booking.id}
              existingReview={existingReview}
              staffName={booking.staff?.name ?? null}
              canReview={canReview}
              deadlineIso={
                deadlineMs != null ? new Date(deadlineMs).toISOString() : null
              }
              timeZone={tz}
            />
          );
        })()}
    </Card>
  );
}
