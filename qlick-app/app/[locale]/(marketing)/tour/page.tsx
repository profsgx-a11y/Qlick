import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
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
  RefreshCw,
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

// Real product screenshots, one per tour.sections entry, in order.
// Files live per-locale under public/tour/{el,en}/ so EN visitors see the
// English UI and EL visitors the Greek one.
const SECTION_SHOTS: {
  file: string;
  width: number;
  height: number;
  frame: "phone" | "browser";
}[] = [
  { file: "store-mobile.png", width: 344, height: 746, frame: "phone" },
  { file: "booking.png", width: 343, height: 745, frame: "phone" },
  { file: "calendar.png", width: 1920, height: 1080, frame: "browser" },
  { file: "appointments.png", width: 1920, height: 1080, frame: "browser" },
  { file: "services.png", width: 1920, height: 1080, frame: "browser" },
  { file: "staff.png", width: 1920, height: 1080, frame: "browser" },
  { file: "customers.png", width: 1920, height: 1080, frame: "browser" },
  { file: "qr-poster.png", width: 1920, height: 1080, frame: "browser" },
  { file: "reviews.png", width: 1920, height: 1080, frame: "browser" },
  { file: "reports.png", width: 1920, height: 1080, frame: "browser" },
];

const LOOP_ICONS = [QrCode, Clock, CalendarCheck];

// The Google Calendar row sits right after the appointments list (index 3),
// since both are about the same thing: where your bookings end up.
const GCAL_AFTER_SECTION = 3;

type GcalVisual = {
  source: string;
  target: string;
  syncLabel: string;
  events: { time: string; title: string }[];
};

// A diagram (not a screenshot): the same appointments living in Qlick and in
// the owner's Google Calendar, with the automatic push between them.
function GoogleCalendarSync({ visual }: { visual: GcalVisual }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[28px] bg-gold/10 blur-2xl"
      />
      <div className="rounded-2xl border border-border bg-surface p-4 elev-card sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
          <SyncPanel
            title={visual.source}
            icon={
              <span className="grid size-7 place-items-center rounded-lg bg-gold/15 text-gold ring-1 ring-inset ring-gold/25">
                <CalendarCheck className="size-4" strokeWidth={2} />
              </span>
            }
            events={visual.events}
            accent="gold"
          />

          <div
            aria-hidden
            className="flex items-center justify-center gap-2 sm:flex-col"
          >
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/50 sm:h-10 sm:w-px sm:bg-gradient-to-b" />
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
              <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
            </span>
            <span className="h-px w-10 bg-gradient-to-r from-gold/50 to-transparent sm:h-10 sm:w-px sm:bg-gradient-to-b" />
          </div>

          <SyncPanel
            title={visual.target}
            icon={
              <span className="grid size-7 place-items-center rounded-lg bg-white/90 ring-1 ring-inset ring-black/10">
                <GoogleGlyph />
              </span>
            }
            events={visual.events}
            accent="google"
          />
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-2">
          <RefreshCw className="size-3.5 text-gold" />
          {visual.syncLabel}
        </p>
      </div>
    </div>
  );
}

function SyncPanel({
  title,
  icon,
  events,
  accent,
}: {
  title: string;
  icon: ReactNode;
  events: { time: string; title: string }[];
  accent: "gold" | "google";
}) {
  const chip =
    accent === "gold"
      ? "border-gold/70 bg-gold/10"
      : "border-[#4285F4] bg-[#4285F4]/15";
  const time = accent === "gold" ? "text-gold" : "text-[#8ab4f8]";
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-display text-sm font-bold text-foreground">
          {title}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {events.map((e) => (
          <li
            key={e.time}
            className={`rounded-lg border-l-2 px-2.5 py-1.5 ${chip}`}
          >
            <span className={`block text-[11px] font-semibold ${time}`}>
              {e.time}
            </span>
            <span className="block truncate text-[11px] text-foreground/85">
              {e.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
              // The Google Calendar row is injected mid-list, so every row
              // after it shifts one position in the left/right alternation.
              const row = i > GCAL_AFTER_SECTION ? i + 1 : i;
              const flip = row % 2 === 1;
              return (
                <Fragment key={s.title}>
                  <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                    <Reveal className={flip ? "lg:order-2" : undefined}>
                      {shot.frame === "phone" ? (
                        <PhoneShot src={`/tour/${locale}/${shot.file}`} width={shot.width} height={shot.height} alt={s.title} />
                      ) : (
                        <BrowserShot src={`/tour/${locale}/${shot.file}`} width={shot.width} height={shot.height} alt={s.title} />
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

                  {i === GCAL_AFTER_SECTION && (
                    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                      <Reveal>
                        <GoogleCalendarSync visual={d.gcalVisual} />
                      </Reveal>
                      <Reveal delay={0.08}>
                        <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                          {d.gcalTitle}
                        </h3>
                        <p className="mt-3 text-muted md:text-lg">{d.gcalBody}</p>
                        <ul className="mt-6 space-y-3">
                          {d.gcalPoints.map((p) => (
                            <li key={p} className="flex items-start gap-3">
                              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                                <Check className="size-3.5" />
                              </span>
                              <span className="text-foreground/90">{p}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-6 text-sm text-muted-2">{d.gcalNote}</p>
                      </Reveal>
                    </div>
                  )}
                </Fragment>
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
                src={`/tour/${locale}/store-desktop.png`}
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

