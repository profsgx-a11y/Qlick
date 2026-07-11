import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Scissors,
  Star,
  Tag,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { DemoBookingPreview } from "@/components/marketing/demo-booking-preview";
import { getDictionary, hasLocale } from "@/i18n/config";
import { formatPrice, formatDuration } from "@/lib/format";
import { demoShop } from "@/lib/demo-shop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(hasLocale(locale) ? locale : "el");
  const canonical = `/${locale}/demo`;
  return {
    title: dict.demo.metaTitle,
    description: dict.demo.metaDescription,
    alternates: {
      canonical,
      languages: { el: "/el/demo", en: "/en/demo", "x-default": "/el/demo" },
    },
    openGraph: {
      title: dict.demo.metaTitle,
      description: dict.demo.metaDescription,
      type: "website",
      url: canonical,
    },
  };
}

export default async function DemoStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.shop;
  const d = dict.demo;
  const isEl = locale !== "en";

  const description = isEl ? demoShop.description : demoShop.descriptionEn;
  const addressLine = isEl ? demoShop.addressEl : demoShop.addressEn;

  // Order hours Mon..Sun for display
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  const hoursByDay = new Map(demoShop.hours.map((h) => [h.dayOfWeek, h]));

  const fmtReviewDate = (daysAgo: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    return new Intl.DateTimeFormat(isEl ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(dt);
  };

  const reviewsCountLabel = d.reviewsCount.replace(
    "{count}",
    String(demoShop.ratingCount),
  );

  return (
    <div className="min-h-screen">
      {/* Demo ribbon — makes clear this is a sample, not a real shop */}
      <div className="border-b border-gold/30 bg-gold/10">
        <Container size="lg">
          <p className="flex flex-wrap items-center justify-center gap-2 py-2.5 text-center text-sm text-gold">
            <Sparkles className="size-4 shrink-0" />
            <span className="font-semibold">{d.ribbon}</span>
            <span className="text-gold/80">· {d.ribbonNote}</span>
          </p>
        </Container>
      </div>

      {/* Hero — branded cover placeholder + logo monogram */}
      <section className="border-b border-border">
        <div className="relative h-44 w-full overflow-hidden sm:h-60 md:h-64">
          <div className="bg-gold-glow relative size-full">
            <div className="bg-hero-grid absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
          </div>
        </div>

        <Container size="lg">
          <div className="relative -mt-16 animate-rise pb-8 sm:-mt-20 md:pb-10">
            <div className="flex items-end gap-10 lg:gap-14">
              {/* Logo monogram — desktop */}
              <div className="relative hidden shrink-0 md:block">
                <div
                  aria-hidden
                  className="absolute -inset-6 -z-10 rounded-[36px] bg-gold/15 blur-2xl"
                />
                <div className="grid h-48 w-48 place-items-center rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60 ring-1 ring-gold/20 lg:h-56 lg:w-56">
                  <Scissors className="size-16 text-gold lg:size-20" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-4">
                  {/* Logo monogram — mobile */}
                  <div className="grid size-24 shrink-0 place-items-center rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60 ring-1 ring-gold/20 sm:size-28 md:hidden">
                    <Scissors className="size-10 text-gold sm:size-12" />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold backdrop-blur-sm [box-shadow:var(--glow-nav)]">
                      <Scissors className="size-3" />
                      {t.bookingBadge}
                    </span>
                    <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                      {demoShop.name}
                    </h1>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-base text-muted md:text-lg">
                  {description}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-gold" />
                    {addressLine}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-4 text-gold" />
                    {demoShop.phone}
                  </span>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <DemoBookingPreview
                    locale={locale}
                    triggerLabel={t.book}
                    anyAvailableLabel={dict.booking.anyAvailable}
                    dict={d}
                    triggerClassName="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-7 text-base font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
                  />
                  <a
                    href="#reviews"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 backdrop-blur-sm transition-colors duration-200 hover:border-gold-soft"
                  >
                    <Stars rating={demoShop.ratingAvg} />
                    <span className="text-sm font-semibold text-foreground">
                      {demoShop.ratingAvg.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted">
                      ({demoShop.ratingCount})
                    </span>
                  </a>
                </div>
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
            <div className="mt-5 space-y-3">
              {demoShop.services.map((s, i) => (
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
                      <h3 className="font-semibold text-foreground">
                        {isEl ? s.name : s.nameEn}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted">
                        {isEl ? s.description : s.descriptionEn}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                          <Clock className="size-3.5" />
                          {formatDuration(s.durationMinutes, locale)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
                          {formatPrice(s.priceCents, locale)}
                        </span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                      <DemoBookingPreview
                        locale={locale}
                        triggerLabel={t.book}
                        anyAvailableLabel={dict.booking.anyAvailable}
                        dict={d}
                        triggerClassName="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-5 text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 sm:hidden">
                    <DemoBookingPreview
                      locale={locale}
                      triggerLabel={t.book}
                      anyAvailableLabel={dict.booking.anyAvailable}
                      dict={d}
                      triggerClassName="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gold text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.98]"
                    />
                  </div>
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
                  const h = hoursByDay.get(dow);
                  const closed = !h || h.isClosed;
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
                          closed
                            ? "text-right text-muted-2"
                            : "text-right text-muted"
                        }
                      >
                        {closed ? t.closed : `${h!.open} - ${h!.close}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section id="reviews" className="scroll-mt-20 border-t border-border py-12">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {t.reviewsTitle}
            </h2>
            <span className="inline-flex items-center gap-1.5">
              <Stars rating={demoShop.ratingAvg} />
              <span className="text-sm font-semibold text-foreground">
                {demoShop.ratingAvg.toFixed(1)}
              </span>
              <span className="text-sm text-muted">· {reviewsCountLabel}</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {demoShop.staff.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold-soft"
              >
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-black"
                  style={{ backgroundColor: m.color }}
                >
                  {m.name.slice(0, 1)}
                </span>
                {m.name}
                <span className="inline-flex items-center gap-0.5 text-gold">
                  <Star className="size-3.5 fill-gold" />
                  {m.avg.toFixed(1)}
                </span>
                <span className="text-muted">({m.count})</span>
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {demoShop.reviews.map((rv, i) => (
              <div
                key={rv.id}
                style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                className="animate-rise rounded-2xl border border-border bg-surface p-5 elev-card transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-card-hover)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars rating={rv.rating} />
                  <span className="text-xs text-muted">
                    {fmtReviewDate(rv.daysAgo)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {rv.customerName}
                  <span className="font-normal text-muted">
                    {" · "}
                    {rv.staffName}
                  </span>
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  {isEl ? rv.comment : rv.commentEn}
                </p>
                {rv.reply && (
                  <div className="mt-3 rounded-lg border-l-2 border-gold bg-surface-2/50 px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
                      {t.businessReply}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground/90">
                      {isEl ? rv.reply : rv.replyEn}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA — convert the prospect */}
        <section className="border-t border-border py-14">
          <div className="mx-auto max-w-2xl rounded-3xl border border-gold/30 bg-gold/5 p-8 text-center md:p-10">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {d.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">{d.ctaBody}</p>
            <Link
              href={`/${locale}/signup/business`}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-base font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
            >
              {d.ctaButton}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
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
