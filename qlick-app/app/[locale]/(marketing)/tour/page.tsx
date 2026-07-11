import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Sparkles,
  QrCode,
  Clock,
  CalendarCheck,
  Check,
  ArrowRight,
  BadgeEuro,
  UserRound,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/primitives";
import { BrowserShot, PhoneShot } from "@/components/marketing/screenshot-frame";
import { getDictionary, hasLocale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(hasLocale(locale) ? locale : "el");
  const canonical = `/${locale}/tour`;
  return {
    title: dict.tour.metaTitle,
    description: dict.tour.metaDescription,
    alternates: {
      canonical,
      languages: { el: "/el/tour", en: "/en/tour", "x-default": "/el/tour" },
    },
    openGraph: {
      title: dict.tour.metaTitle,
      description: dict.tour.metaDescription,
      type: "website",
      url: canonical,
    },
  };
}

// Real product screenshots (public/tour), one per demo.sections entry, in order.
const SECTION_SHOTS: {
  src: string;
  width: number;
  height: number;
  frame: "phone" | "browser";
}[] = [
  { src: "/tour/store-mobile.png", width: 860, height: 1864, frame: "phone" },
  { src: "/tour/booking-time.png", width: 393, height: 852, frame: "phone" },
  { src: "/tour/dash-calendar.png", width: 1440, height: 900, frame: "browser" },
  { src: "/tour/dash-qr.png", width: 1440, height: 900, frame: "browser" },
  { src: "/tour/dash-bookings.png", width: 1440, height: 900, frame: "browser" },
  { src: "/tour/dash-reviews.png", width: 1440, height: 900, frame: "browser" },
  { src: "/tour/dash-reports.png", width: 1440, height: 900, frame: "browser" },
];

const LOOP_ICONS = [QrCode, Clock, CalendarCheck];

export default async function DemoTourPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const d = dict.tour;

  return (
    <div className="min-h-screen">
      {/* ──────────── HERO ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="lg" className="relative">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
              <Sparkles className="size-3.5" />
              {d.eyebrow}
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {d.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
              {d.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Button asChild size="xl">
                <Link href={`/${locale}/signup/business`}>
                  {d.ctaPrimary}
                  <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="xl">
                <Link href={`/${locale}/b/barber-house`}>{d.ctaSecondary}</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ──────────── THE 3-STEP LOOP ──────────── */}
      <section className="border-t border-border py-16 md:py-24">
        <Container size="lg">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {d.loopTitle}
            </h2>
            <p className="mt-4 text-lg text-muted">{d.loopSubtitle}</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {d.loop.map((step, i) => {
              const Icon = LOOP_ICONS[i] ?? QrCode;
              return (
                <Reveal key={step.title} delay={i * 0.08}>
                  <div className="relative h-full rounded-2xl border border-border bg-surface p-6 elev-card">
                    <span className="absolute right-5 top-4 font-display text-4xl font-extrabold text-gold/15">
                      {i + 1}
                    </span>
                    <span className="grid size-12 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/20">
                      <Icon className="size-6" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── REAL SCREENS, ZIG-ZAG ──────────── */}
      <section className="border-t border-border bg-surface/30 py-16 md:py-24">
        <Container size="lg">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              {d.sectionsEyebrow}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {d.sectionsTitle}
            </h2>
            <p className="mt-4 text-lg text-muted">{d.sectionsSubtitle}</p>
          </Reveal>

          <div className="mt-14 space-y-16 md:space-y-24">
            {d.sections.map((s, i) => {
              const shot = SECTION_SHOTS[i];
              const flip = i % 2 === 1;
              return (
                <div
                  key={s.title}
                  className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
                >
                  <Reveal className={flip ? "lg:order-2" : undefined}>
                    {shot.frame === "phone" ? (
                      <PhoneShot src={shot.src} width={shot.width} height={shot.height} alt={s.title} />
                    ) : (
                      <BrowserShot src={shot.src} width={shot.width} height={shot.height} alt={s.title} />
                    )}
                  </Reveal>
                  <Reveal delay={0.08} className={flip ? "lg:order-1" : undefined}>
                    <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-muted md:text-lg">{s.body}</p>
                    <ul className="mt-6 space-y-3">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                            <Check className="size-3.5" />
                          </span>
                          <span className="text-foreground/90">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── RETENTION ──────────── */}
      <section className="border-t border-border py-16 md:py-24">
        <Container size="lg">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold">
                <UserRound className="size-3.5" />
                Qlick
              </span>
              <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {d.retentionTitle}
              </h2>
              <p className="mt-4 text-muted md:text-lg">{d.retentionBody}</p>
              <ul className="mt-6 space-y-3">
                {d.retentionPoints.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-foreground/90">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08}>
              <BrowserShot
                src="/tour/store-desktop.png"
                width={1440}
                height={900}
                alt={d.retentionTitle}
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ──────────── EXTRAS ──────────── */}
      <section className="border-t border-border bg-surface/30 py-16 md:py-20">
        <Container size="lg">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {d.extrasTitle}
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.extras.map((x, i) => (
              <Reveal key={x.title} delay={(i % 4) * 0.06}>
                <div className="h-full rounded-2xl border border-border bg-surface p-5 elev-card">
                  <h3 className="font-semibold text-foreground">{x.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {x.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* What you DON'T pay */}
          <Reveal delay={0.1}>
            <div className="mt-10 rounded-3xl border border-gold/30 bg-gold/5 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                  <BadgeEuro className="size-5 text-gold" />
                  {d.noPayTitle}
                </h3>
                <Link
                  href={`/${locale}#pricing`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-bright"
                >
                  {d.noPayLink}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {d.noPayItems.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-sm text-foreground/90">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="border-t border-border py-16 md:py-24">
        <Container size="lg">
          <Reveal>
            <div className="mx-auto max-w-2xl rounded-3xl border border-gold/30 bg-gold/5 p-8 text-center md:p-12">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {d.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted">{d.ctaBody}</p>
              <Button asChild size="xl" className="mt-8">
                <Link href={`/${locale}/signup/business`}>
                  {d.ctaButton}
                  <ArrowRight className="ml-1" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}

