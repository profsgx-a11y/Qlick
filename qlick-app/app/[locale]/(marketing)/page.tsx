import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  QrCode,
  Sparkles,
  BarChart3,
  Smartphone,
  Check,
  ArrowRight,
  Scissors,
  Hand,
  Flower2,
  PenTool,
  Brush,
  Smile,
  Brain,
  Activity,
  Apple,
  Dumbbell,
  Stethoscope,
  ShieldCheck,
  Lock,
  Languages,
  KeyRound,
  BadgeEuro,
  Clock,
  CalendarCheck,
  UserRound,
  Search,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, CountUp, Magnetic } from "@/components/motion/primitives";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { PhoneDemo } from "@/components/marketing/phone-demo";
import { Marquee } from "@/components/marketing/marquee";
import { getDictionary, hasLocale } from "@/i18n/config";
import { generateQrSvg } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { renderDesignToSvg } from "@/lib/qr-render";
import type { QrDesign } from "@/lib/qr-template";

const industryIcons = [
  Scissors,
  Sparkles,
  Hand,
  Flower2,
  PenTool,
  Brush,
  Smile,
  Brain,
  Activity,
  Apple,
  Dumbbell,
  Stethoscope,
];

const reliabilityIcons = [ShieldCheck, Lock, Languages, KeyRound, BadgeEuro, Clock];

const retentionIcons = [QrCode, CalendarCheck, UserRound];

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const qrSvg = await generateQrSvg("https://qlick.gr/b/barber-house");

  // Showcase the latest saved poster design on the hero
  const supabase = await createClient();
  const { data: tpl } = await supabase
    .from("qr_templates")
    .select("config")
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const showcase = tpl?.config as unknown as QrDesign | null;
  const posterSvg =
    showcase && Array.isArray(showcase.elements) && showcase.elements.length
      ? await renderDesignToSvg(showcase)
      : null;

  // Prefer a flat PNG of the poster if one is dropped into /public. A single raster
  // image survives browser "night mode" filters (treated as a photo) — unlike the
  // hybrid inline SVG, whose embedded schedule-table image goes dark-on-dark.
  const heroPng = existsSync(join(process.cwd(), "public", "hero-poster.png"))
    ? "/hero-poster.png"
    : null;

  return (
    <>
      {/* ──────────── HERO ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden pt-14 pb-24 md:pt-20 md:pb-28">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="flex flex-col items-start lg:col-span-7">
              <Reveal y={20}>
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
                  <Sparkles className="size-3.5" strokeWidth={2} />
                  {dict.hero.eyebrow}
                </span>
              </Reveal>

              <Reveal delay={0.08} y={26}>
                <h1 className="mt-7 max-w-[15ch] font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  {dict.hero.title}{" "}
                  <span className="text-gold">{dict.hero.titleAccent}</span>
                </h1>
              </Reveal>

              <Reveal delay={0.16} y={24}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
                  {dict.hero.subtitle}
                </p>
              </Reveal>

              <Reveal delay={0.24} y={20}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Magnetic>
                    <Button asChild size="xl">
                      <Link href={`/${locale}/signup/business`}>
                        {dict.hero.primaryCta}
                        <ArrowRight className="ml-1" />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Button asChild variant="secondary" size="xl">
                    <Link href="#how-it-works">{dict.hero.secondaryCta}</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="flex items-center justify-center lg:col-span-5 lg:justify-end lg:pr-10">
              <HeroVisual
                posterPng={heroPng}
                posterSvg={posterSvg}
                qrSvg={qrSvg}
                toasts={dict.hero.toasts}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ──────────── STATS BAND ──────────── */}
      <section className="border-y border-border bg-surface/40">
        <Container size="xl">
          <div className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
            {dict.landing.stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08} className="px-6 py-12 md:px-10">
                <p className="font-display text-4xl font-extrabold tracking-tight text-gold md:text-5xl">
                  {typeof stat.value === "number" ? (
                    <CountUp to={stat.value} />
                  ) : (
                    stat.value
                  )}
                  {stat.suffix}
                </p>
                <p className="mt-2 text-sm leading-snug text-muted">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ──────────── PRODUCT SHOWCASE — the live booking page ──────────── */}
      <section className="overflow-hidden py-24 md:py-32">
        <Container size="xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {dict.landing.showcase.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {dict.landing.showcase.subtitle}
            </p>
          </Reveal>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr] lg:gap-16">
            {/* left points */}
            <div className="order-2 space-y-12 lg:order-1 lg:text-right">
              {dict.landing.showcase.points.slice(0, 2).map((point, i) => (
                <Reveal key={point.title} delay={0.1 + i * 0.12}>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted lg:ml-auto lg:max-w-[300px]">
                    {point.body}
                  </p>
                </Reveal>
              ))}
            </div>

            {/* the phone */}
            <Reveal className="order-1 lg:order-2" y={48}>
              <PhoneDemo s={dict.landing.showcase.phone} />
            </Reveal>

            {/* right point */}
            <div className="order-3 space-y-12">
              {dict.landing.showcase.points.slice(2).map((point, i) => (
                <Reveal key={point.title} delay={0.1 + i * 0.12}>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-muted">
                    {point.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ──────────── HOW IT WORKS — sticky stacking steps ──────────── */}
      <section
        id="how-it-works"
        className="border-t border-border bg-surface/30 py-24 md:py-32"
      >
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {dict.howItWorks.title}
            </h2>
          </Reveal>

          <div className="relative mt-16 space-y-8 pb-8">
            {dict.howItWorks.steps.map((step, i) => (
              <div
                key={step.number}
                className="sticky"
                style={{ top: `${96 + i * 28}px`, zIndex: i + 1 }}
              >
                <div className="surface-raise grid min-h-[340px] items-center gap-8 rounded-3xl border border-border p-8 elev-card md:grid-cols-[auto_1fr] md:p-14">
                  <span className="font-display text-7xl font-extrabold leading-none text-gold/25 md:text-9xl">
                    {step.number}
                  </span>
                  <div className="max-w-xl">
                    <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ──────────── FEATURES — bento grid ──────────── */}
      <section id="features" className="border-t border-border py-24 md:py-32">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              {dict.valueProps.eyebrow}
            </span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {dict.valueProps.title}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-12">
            {/* QR on your door — large cell with a real QR visual */}
            <Reveal className="md:col-span-7">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface p-8 elev-card transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out)] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)] md:p-10">
                <div className="glow-gold pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {dict.valueProps.items[0].title}
                    </h3>
                    <p className="mt-3 max-w-sm leading-relaxed text-muted">
                      {dict.valueProps.items[0].description}
                    </p>
                  </div>
                  <div
                    className="mx-auto w-36 rotate-3 rounded-2xl bg-white p-3 shadow-2xl shadow-black/60 transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-0 group-hover:scale-105 sm:w-40 [&>svg]:h-auto [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                </div>
              </div>
            </Reveal>

            {/* Calendar — cell with abstract week visual */}
            <Reveal delay={0.08} className="md:col-span-5">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface p-8 elev-card transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out)] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)] md:p-10">
                <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {dict.valueProps.items[1].title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">
                  {dict.valueProps.items[1].description}
                </p>
                <div className="mt-8 flex h-24 items-end gap-2" aria-hidden>
                  {[42, 68, 34, 88, 56, 96, 48].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={
                        "flex-1 rounded-t-md transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-y-105 " +
                        (i === 3 || i === 5 ? "bg-gold/70" : "bg-surface-3")
                      }
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            {/* three compact cells */}
            {[2, 3, 4].map((idx, i) => {
              const icons = [Sparkles, BarChart3, Smartphone];
              const Icon = icons[i];
              return (
                <Reveal key={idx} delay={0.06 * i} className="md:col-span-4">
                  <div className="group h-full rounded-3xl border border-border bg-surface p-8 elev-card transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out)] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]">
                    <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-110">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {dict.valueProps.items[idx].title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {dict.valueProps.items[idx].description}
                    </p>
                  </div>
                </Reveal>
              );
            })}

            {/* Returning customers — full-width cell with the retention flow */}
            <Reveal className="md:col-span-12">
              <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-surface p-8 [box-shadow:var(--shadow-card-gold)] md:p-10">
                <div className="bg-gold-glow pointer-events-none absolute inset-0 opacity-60" />
                <div className="relative grid items-center gap-10 lg:grid-cols-2">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {dict.valueProps.items[5].title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-muted">
                      {dict.valueProps.items[5].description}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    {dict.landing.retention.flow.map((label, i) => {
                      const Icon = retentionIcons[i] ?? Search;
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                              <Icon className="size-5" strokeWidth={1.75} />
                            </span>
                            <span className="max-w-[150px] text-sm font-medium leading-snug text-foreground">
                              {label}
                            </span>
                          </div>
                          {i < dict.landing.retention.flow.length - 1 && (
                            <ArrowRight className="ml-1 hidden size-4 shrink-0 text-gold/50 sm:block" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ──────────── INDUSTRIES — marquee ──────────── */}
      <section className="border-t border-border py-24 md:py-28">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {dict.industries.title}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{dict.industries.subtitle}</p>
          </Reveal>
        </Container>

        <div className="mt-12 space-y-4">
          <Marquee duration={46}>
            {dict.industries.items.slice(0, 6).map((item, i) => {
              const Icon = industryIcons[i] ?? Sparkles;
              return (
                <span
                  key={item.title}
                  className="inline-flex items-center gap-3 rounded-full border border-border bg-surface py-3 pl-4 pr-6"
                >
                  <span className="grid size-8 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                </span>
              );
            })}
          </Marquee>
          <Marquee duration={52} reverse>
            {dict.industries.items.slice(6).map((item, i) => {
              const Icon = industryIcons[i + 6] ?? Sparkles;
              return (
                <span
                  key={item.title}
                  className="inline-flex items-center gap-3 rounded-full border border-border bg-surface py-3 pl-4 pr-6"
                >
                  <span className="grid size-8 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                </span>
              );
            })}
          </Marquee>
        </div>

        <Container size="xl">
          <p className="mt-8 text-sm text-muted-2">+ {dict.industries.more}</p>
        </Container>
      </section>

      {/* ──────────── TRUST ──────────── */}
      <section className="border-t border-border bg-surface/30 py-24 md:py-32">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {dict.reliability.title}
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {dict.reliability.items.map((item, i) => {
              const Icon = reliabilityIcons[i] ?? ShieldCheck;
              return (
                <Reveal key={item.title} delay={(i % 3) * 0.08}>
                  <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── PRICING ──────────── */}
      <section id="pricing" className="border-t border-border py-24 md:py-32">
        <Container size="xl">
          <Reveal className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              {dict.pricing.eyebrow}
            </span>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {dict.pricing.title}
            </h2>
            <p className="mt-4 text-lg text-muted">{dict.pricing.subtitle}</p>
          </Reveal>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {dict.pricing.plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div
                  className={
                    plan.highlighted
                      ? "relative h-full rounded-3xl border border-gold bg-surface p-8 shadow-[0_24px_60px_-30px_var(--gold-glow)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[0_30px_72px_-26px_var(--gold-glow)]"
                      : "h-full rounded-3xl border border-border bg-surface p-8 elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                  }
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                      {dict.pricing.popular}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-muted">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    {plan.oldPrice && (
                      <span className="text-2xl font-semibold text-muted-2 line-through">
                        {plan.oldPrice}
                      </span>
                    )}
                    <span className="font-display text-5xl font-extrabold text-gold">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-muted">{plan.period}</span>
                    )}
                  </div>
                  <p className="mt-3 min-h-[3rem] text-sm text-muted">
                    {plan.description}
                  </p>
                  <Button
                    asChild
                    variant={plan.highlighted ? "primary" : "secondary"}
                    className="mt-6 w-full"
                  >
                    <Link href={`/${locale}/signup/business`}>{plan.cta}</Link>
                  </Button>
                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ──────────── FINAL CTA — with a scannable QR ──────────── */}
      <section className="border-t border-border py-24 md:py-32">
        <Container size="lg">
          <Reveal>
            <div className="bg-gold-glow relative overflow-hidden rounded-3xl border border-gold/30 p-10 md:p-16">
              <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
                <div className="text-center lg:text-left">
                  <h2 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                    {dict.cta.title}
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-lg text-muted lg:mx-0">
                    {dict.cta.subtitle}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                    <Magnetic>
                      <Button asChild size="xl">
                        <Link href={`/${locale}/signup/business`}>
                          {dict.cta.primary}
                          <ArrowRight className="ml-1" />
                        </Link>
                      </Button>
                    </Magnetic>
                    <Button asChild variant="secondary" size="xl">
                      <Link href={`/${locale}/contact`}>{dict.cta.secondary}</Link>
                    </Button>
                  </div>
                </div>

                <div className="mx-auto flex flex-col items-center gap-4">
                  <div
                    className="w-40 rounded-2xl bg-white p-3 shadow-2xl shadow-black/60 [&>svg]:h-auto [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {dict.landing.scan.hint}
                    </p>
                    <p className="text-xs text-muted">{dict.landing.scan.sub}</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
