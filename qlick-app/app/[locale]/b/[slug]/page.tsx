import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  Scissors,
  Star,
  Tag,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { FavoriteButton } from "@/components/account/favorite-button";
import { BookingModal } from "@/components/booking/booking-modal";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { formatPrice, formatDuration } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const isEl = locale !== "en";
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("name, description, description_en, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz || biz.status !== "active") {
    return { title: isEl ? "Κατάστημα" : "Business" };
  }
  const description =
    (isEl ? biz.description : biz.description_en) ||
    (isEl
      ? `Κλείσε ραντεβού online στο ${biz.name} με το Qlick.`
      : `Book an appointment online at ${biz.name} with Qlick.`);
  // Canonical URL (resolved against metadataBase = https://www.qlick.gr).
  // og:url is what Facebook/Messenger key their link cache on — omitting it
  // makes Messenger drop the preview.
  const canonical = `/${locale}/b/${slug}`;
  return {
    title: biz.name,
    description,
    alternates: {
      canonical,
      languages: {
        el: `/el/b/${slug}`,
        en: `/en/b/${slug}`,
        "x-default": `/el/b/${slug}`,
      },
    },
    openGraph: {
      title: `${biz.name} · Qlick`,
      description,
      type: "website",
      url: canonical,
    },
    twitter: { card: "summary_large_image", title: `${biz.name} · Qlick`, description },
  };
}

export default async function PublicBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.shop;
  // Carry a QR origin marker through to the booking flow (for source attribution).
  const src = (await searchParams).src === "qr" ? "qr" : "web";

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, status, phone, landline, address, description, day_order, show_reviews, logo_url, cover_url, bookings_paused, timezone",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!business || business.status !== "active") notFound();

  // Manual pause OR expired trial/subscription both close online bookings
  // (create_booking enforces the same rule server-side).
  const { data: planActive } = await supabase.rpc("business_plan_active", {
    p_business_id: business.id,
  });
  const bookingsPaused = (business.bookings_paused ?? false) || !(planActive ?? true);

  // Is the visitor signed in, and have they favorited this business?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("business_id")
      .eq("customer_id", user.id)
      .eq("business_id", business.id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  const [{ data: services }, { data: hours }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, duration_minutes, price_cents")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .eq("bookable_online", true)
      .order("order_index")
      .order("created_at"),
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", business.id)
      .order("day_of_week"),
  ]);

  // ── Booking data for the in-page booking modal ──────────────────────────
  // Mirrors what /b/[slug]/book/page.tsx loads, so the popup runs the exact
  // same BookingFlow. Only fetched when bookings are open.
  let bookableStaff: {
    id: string;
    name: string;
    title: string | null;
    avatarUrl: string | null;
    color: string | null;
  }[] = [];
  const serviceStaff: Record<string, string[]> = {};
  let defaultName = "";
  let defaultPhone = "";
  if (!bookingsPaused) {
    const { data: staffOpts } = await supabase
      .from("staff")
      .select("id, name, title, avatar_url, color")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .eq("is_bookable", true)
      .order("order_index")
      .order("created_at");
    bookableStaff = (staffOpts ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      avatarUrl: s.avatar_url,
      color: s.color,
    }));

    const staffIds = bookableStaff.map((s) => s.id);
    if (staffIds.length > 0) {
      const { data: ssRows } = await supabase
        .from("service_staff")
        .select("service_id, staff_id")
        .in("staff_id", staffIds);
      for (const r of ssRows ?? []) {
        (serviceStaff[r.service_id] ??= []).push(r.staff_id);
      }
    }

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      defaultName =
        [profile?.first_name, profile?.last_name]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join(" ") || "";
      defaultPhone = profile?.phone ?? "";
    }
  }

  const bookingModalProps = {
    locale,
    business: { id: business.id, name: business.name, slug: business.slug },
    services: services ?? [],
    staff: bookableStaff,
    serviceStaff,
    isAuthenticated: !!user,
    defaultName,
    defaultPhone,
    source: src,
  };

  const address = (business.address ?? {}) as {
    street?: string;
    city?: string;
    postcode?: string;
    lat?: number | null;
    lng?: number | null;
  };
  const addressLine = [address.street, address.city, address.postcode]
    .filter(Boolean)
    .join(", ");

  // Order hours by the business's saved day order (fallback Mon..Sun)
  const orderedDays = (
    Array.isArray(business.day_order) ? business.day_order : [1, 2, 3, 4, 5, 6, 0]
  ) as number[];

  // Reviews (published) + per-staff ratings, if the business shows them.
  const showReviews = business.show_reviews ?? true;
  const [{ data: reviewRows }, { data: ratingRows }, { data: staffRows }] =
    showReviews
      ? await Promise.all([
          supabase
            .from("reviews")
            .select(
              "id, staff_name, customer_name, rating, comment, business_reply, created_at",
            )
            .eq("business_id", business.id)
            .eq("status", "published")
            .order("created_at", { ascending: false }),
          supabase
            .from("staff_ratings")
            .select("staff_id, avg_rating, review_count")
            .eq("business_id", business.id),
          supabase
            .from("staff")
            .select("id, name, avatar_url, color")
            .eq("business_id", business.id),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const reviews = reviewRows ?? [];
  const reviewCount = reviews.length;
  const reviewAvg = reviewCount
    ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviewCount
    : 0;

  // "Open now / closed · opens Mon 09:00" chip next to the rating.
  const openInfo = openStatusNow(
    hours ?? [],
    business.timezone || "Europe/Athens",
    new Date(),
    t.days,
    { opensAt: t.opensAt, closesAt: t.closesAt },
  );
  const staffById = new Map(
    (staffRows ?? []).map((s) => [s.id, s] as const),
  );
  const staffRatings = (ratingRows ?? [])
    .map((r) => ({
      staffId: r.staff_id,
      avg: Number(r.avg_rating ?? 0),
      count: r.review_count ?? 0,
      staff: r.staff_id ? staffById.get(r.staff_id) : undefined,
    }))
    .filter((r) => r.staff);

  const fmtReviewDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  // ── LocalBusiness structured data (rich results: rating, hours, address) ──
  const SCHEMA_DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const openingHours = (hours ?? [])
    .filter((h) => !h.is_closed && h.open_time && h.close_time)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAYS[h.day_of_week],
      opens: h.open_time!.slice(0, 5),
      closes: h.close_time!.slice(0, 5),
    }));
  const shopUrl = `https://www.qlick.gr/${locale}/b/${business.slug}`;
  const businessSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": shopUrl,
    name: business.name,
    url: shopUrl,
    ...(business.logo_url || business.cover_url
      ? { image: business.logo_url || business.cover_url }
      : {}),
    ...(business.description ? { description: business.description } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    address: {
      "@type": "PostalAddress",
      ...(address.street ? { streetAddress: address.street } : {}),
      ...(address.city ? { addressLocality: address.city } : {}),
      ...(address.postcode ? { postalCode: address.postcode } : {}),
      addressCountry: "GR",
    },
    ...(address.lat != null && address.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: address.lat,
            longitude: address.lng,
          },
        }
      : {}),
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
    ...(showReviews && reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewAvg.toFixed(1),
            reviewCount,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen">
      <JsonLd data={businessSchema} />
      {/* Hero — cover photo banner (cover photo → branded gold-glow backdrop) */}
      <section className="border-b border-border">
        <div className="relative h-44 w-full overflow-hidden sm:h-60 md:h-64">
          {business.cover_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.cover_url}
                alt=""
                aria-hidden
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-background" />
            </>
          ) : (
            <div className="bg-gold-glow relative size-full">
              <div className="bg-hero-grid absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
            </div>
          )}
        </div>

        <Container size="lg">
          <div className="relative -mt-16 animate-rise pb-8 sm:-mt-20 md:pb-10">
            <div className="flex items-end gap-10 lg:gap-14">
              {/* desktop: logo on the left, sharing the same baseline as the CTA
                  row, with a soft gold halo so it sits in the page's ambience */}
              {business.logo_url && (
                <div className="relative hidden shrink-0 md:block">
                  <div
                    aria-hidden
                    className="absolute -inset-6 -z-10 rounded-[36px] bg-gold/15 blur-2xl"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="h-48 w-auto max-w-[380px] rounded-2xl border border-border bg-surface object-contain shadow-2xl shadow-black/60 ring-1 ring-gold/20 lg:h-56 lg:max-w-[440px]"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-4">
                {/* mobile/tablet: compact logo next to the name */}
                {business.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="h-24 w-auto max-w-[180px] shrink-0 rounded-2xl border border-border bg-surface object-contain shadow-2xl shadow-black/60 ring-1 ring-gold/20 sm:h-28 sm:max-w-[220px] md:hidden"
                  />
                )}
                <div className="min-w-0 flex-1 pb-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold backdrop-blur-sm [box-shadow:var(--glow-nav)]">
                    <Scissors className="size-3" />
                    {t.bookingBadge}
                  </span>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                      {business.name}
                    </h1>
                    <FavoriteButton
                      locale={locale}
                      businessId={business.id}
                      initialFavorited={isFavorited}
                      isAuthed={!!user}
                    />
                  </div>
                </div>
              </div>

              {business.description && (
                <p className="mt-4 max-w-2xl text-base text-muted md:text-lg">
                  {business.description}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {addressLine && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-gold" />
                    {addressLine}
                  </span>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="size-4 text-gold" />
                    {business.phone}
                  </a>
                )}
                {business.landline && (
                  <a
                    href={`tel:${business.landline}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="size-4 text-gold" />
                    {business.landline}
                  </a>
                )}
              </div>

              {/* rating + open status (Google-style social proof row) */}
              {((showReviews && reviewCount > 0) || openInfo) && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {showReviews && reviewCount > 0 && (
                    <a
                      href="#reviews"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 backdrop-blur-sm transition-colors duration-200 hover:border-gold-soft"
                    >
                      <Stars rating={reviewAvg} />
                      <span className="text-sm font-semibold text-foreground">
                        {reviewAvg.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted">({reviewCount})</span>
                    </a>
                  )}
                  {openInfo && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm backdrop-blur-sm">
                      <span
                        className={
                          openInfo.open
                            ? "font-semibold text-success"
                            : "font-semibold text-danger"
                        }
                      >
                        {openInfo.open ? t.openNow : t.closedNow}
                      </span>
                      {openInfo.label && (
                        <span className="text-muted">· {openInfo.label}</span>
                      )}
                    </span>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container size="lg">
        <div className="grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr]">
          {/* Services */}
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {t.services}
            </h2>
            {bookingsPaused && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <Clock className="mt-0.5 size-4 shrink-0" />
                <span>{t.bookingsPausedNotice}</span>
              </div>
            )}
            <div className="mt-5 space-y-3">
              {(services ?? []).length === 0 && (
                <p className="text-sm text-muted">{t.noServices}</p>
              )}
              {(services ?? []).map((s, i) => (
                <div
                  key={s.id}
                  style={{ animationDelay: `${i * 55}ms` }}
                  className="group animate-rise rounded-2xl border border-border bg-surface p-5 elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
                      <Tag className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      {s.description && (
                        <p className="mt-0.5 text-sm text-muted">{s.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                          <Clock className="size-3.5" />
                          {formatDuration(s.duration_minutes, locale)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
                          {formatPrice(s.price_cents, locale)}
                        </span>
                      </div>
                    </div>
                    {/* desktop: button sits inline on the right */}
                    {bookingsPaused ? (
                      <span className="hidden h-10 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full border border-border px-5 text-sm font-medium text-muted-2 sm:inline-flex">
                        {t.bookingsPausedShort}
                      </span>
                    ) : (
                      <BookingModal
                        {...bookingModalProps}
                        triggerLabel={t.book}
                        triggerClassName="hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-5 text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97] sm:inline-flex"
                      />
                    )}
                  </div>

                  {/* mobile: full-width button below, easy thumb target */}
                  {bookingsPaused ? (
                    <span className="mt-4 flex h-11 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-border text-sm font-medium text-muted-2 sm:hidden">
                      {t.bookingsPausedShort}
                    </span>
                  ) : (
                    <BookingModal
                      {...bookingModalProps}
                      triggerLabel={t.book}
                      triggerClassName="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gold text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.98] sm:hidden"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hours sidebar */}
          <div>
            <div className="sticky top-6 animate-rise rounded-2xl border border-border bg-surface p-6 elev-card">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
                <Clock className="size-4" />
                {t.hoursTitle}
              </h3>
              <dl className="mt-4 space-y-2">
                {orderedDays.map((dow) => {
                  // A day may have multiple shifts (e.g. morning + afternoon)
                  const dayRows = (hours ?? [])
                    .filter((x) => x.day_of_week === dow && !x.is_closed && x.open_time && x.close_time)
                    .sort((a, b) => (a.open_time ?? "").localeCompare(b.open_time ?? ""));
                  const closed = dayRows.length === 0;
                  return (
                    <div
                      key={dow}
                      className="flex items-start justify-between gap-3 border-b border-border pb-2 text-sm last:border-0"
                    >
                      <dt className="font-medium text-foreground">
                        {t.days[dow]}
                      </dt>
                      <dd
                        className={
                          closed ? "text-right text-muted-2" : "text-right text-muted"
                        }
                      >
                        {closed
                          ? t.closed
                          : dayRows.map((r, i) => (
                              <span key={i} className="block">
                                {(r.open_time ?? "").slice(0, 5)} -{" "}
                                {(r.close_time ?? "").slice(0, 5)}
                              </span>
                            ))}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </div>

        {showReviews && reviewCount > 0 && (
          <section id="reviews" className="scroll-mt-20 border-t border-border py-12">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {t.reviewsTitle}
              </h2>
              <span className="inline-flex items-center gap-1.5">
                <Stars rating={reviewAvg} />
                <span className="text-sm font-semibold text-foreground">
                  {reviewAvg.toFixed(1)}
                </span>
                <span className="text-sm text-muted">({reviewCount})</span>
              </span>
            </div>

            {staffRatings.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {staffRatings.map((r) => (
                  <span
                    key={r.staffId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold-soft"
                  >
                    <span
                      className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-bold text-black"
                      style={{ backgroundColor: r.staff!.color ?? "#a0a3ab" }}
                    >
                      {r.staff!.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.staff!.avatar_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        r.staff!.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    {r.staff!.name}
                    <span className="inline-flex items-center gap-0.5 text-gold">
                      <Star className="size-3.5 fill-gold" />
                      {r.avg.toFixed(1)}
                    </span>
                    <span className="text-muted">({r.count})</span>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {reviews.map((rv, i) => (
                <div
                  key={rv.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                  className="animate-rise rounded-2xl border border-border bg-surface p-5 elev-card transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-card-hover)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Stars rating={rv.rating} />
                    <span className="text-xs text-muted">
                      {fmtReviewDate(rv.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {rv.customer_name ?? t.anonymous}
                    {rv.staff_name && (
                      <span className="font-normal text-muted">
                        {" · "}
                        {rv.staff_name}
                      </span>
                    )}
                  </p>
                  {rv.comment && (
                    <p className="mt-1 text-sm text-foreground/90">
                      {rv.comment}
                    </p>
                  )}
                  {rv.business_reply && (
                    <div className="mt-3 rounded-lg border-l-2 border-gold bg-surface-2/50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
                        {t.businessReply}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground/90">
                        {rv.business_reply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}

interface HourRow {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

/**
 * "Open now / Closed · opens Mon 09:00" from the weekly hours. Uses the
 * business timezone so it's correct for visitors abroad. Overnight shifts
 * (close ≤ open) and special closures are out of scope here — this mirrors
 * the weekly-hours sidebar. Returns null when no hours are set.
 */
function openStatusNow(
  hours: HourRow[],
  tz: string,
  now: Date,
  dayNames: string[],
  labels: { opensAt: string; closesAt: string },
): { open: boolean; label: string } | null {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  const shifts = hours
    .filter((r) => !r.is_closed && r.open_time && r.close_time)
    .map((r) => ({
      dow: r.day_of_week,
      open: toMin(r.open_time as string),
      close: toMin(r.close_time as string),
    }))
    .filter((s) => s.close > s.open);
  if (shifts.length === 0) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const dow =
    ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[
      map.weekday
    ] ?? 0;
  const nowMin = (Number(map.hour) % 24) * 60 + Number(map.minute);

  const openShift = shifts.find(
    (s) => s.dow === dow && nowMin >= s.open && nowMin < s.close,
  );
  if (openShift) {
    return { open: true, label: labels.closesAt.replace("{time}", fmt(openShift.close)) };
  }

  const laterToday = shifts
    .filter((s) => s.dow === dow && s.open > nowMin)
    .sort((a, b) => a.open - b.open)[0];
  if (laterToday) {
    return { open: false, label: labels.opensAt.replace("{time}", fmt(laterToday.open)) };
  }

  for (let i = 1; i <= 7; i++) {
    const d = (dow + i) % 7;
    const next = shifts.filter((s) => s.dow === d).sort((a, b) => a.open - b.open)[0];
    if (next) {
      return {
        open: false,
        label: labels.opensAt.replace("{time}", `${dayNames[d]} ${fmt(next.open)}`),
      };
    }
  }
  return { open: false, label: "" };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i)); // 0..1 for this star
        return (
          <span key={i} className="relative inline-block size-4 shrink-0">
            <Star className="absolute inset-0 size-4 text-muted/40" />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="size-4 fill-gold text-gold" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
