import Link from "next/link";
import { notFound } from "next/navigation";
import {
  QrCode,
  CalendarDays,
  CalendarCheck,
  UserCog,
  Star,
  BarChart3,
  Check,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic } from "@/components/motion/primitives";
import { BrowserShot } from "@/components/marketing/screenshot-frame";
import { PricingSection } from "@/components/marketing/pricing-section";
import { getDictionary, hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEl = locale !== "en";
  return pageMetadata(
    locale,
    "/for-business",
    isEl ? "Για επιχειρήσεις" : "For business",
    isEl
      ? "Δέξου online ραντεβού 24/7, διαχειρίσου ημερολόγιο, προσωπικό και QR poster — 3 μήνες δωρεάν με το Qlick."
      : "Take 24/7 online bookings, manage your calendar, staff and QR poster — 3 months free with Qlick.",
  );
}

export default async function ForBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const isEl = locale === "el";

  const detailIntro = isEl
    ? "Όλα όσα χρειάζεται η επιχείρησή σου για κρατήσεις, σε ένα εργαλείο."
    : "Everything your business needs for bookings, in one tool.";

  const detailGroups: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    points: string[];
  }[] = isEl
    ? [
        {
          icon: CalendarCheck,
          title: "Online κρατήσεις 24/7",
          points: [
            "Οι πελάτες κλείνουν μόνοι τους, ακόμα κι εκτός ωραρίου",
            "Επιλογή υπηρεσίας, ημέρας, ώρας και υπαλλήλου",
            "Σαρώνουν το QR στην πόρτα ή ανοίγουν τον σύνδεσμό σου",
            "Σε ξαναβρίσκουν χωρίς QR, από τα ραντεβού τους, τα αγαπημένα ή την αναζήτηση",
            "Αυτόματη αποτροπή διπλοκρατήσεων",
          ],
        },
        {
          icon: CalendarDays,
          title: "Έξυπνο ημερολόγιο",
          points: [
            "Ημερήσια, εβδομαδιαία & μηνιαία προβολή",
            "Στήλες ανά υπάλληλο",
            "Μετακίνηση ραντεβού με σύρσιμο & αλλαγή διάρκειας",
            "Γρήγορη καταχώρηση πελάτη που ήρθε χωρίς ραντεβού",
          ],
        },
        {
          icon: QrCode,
          title: "QR Poster με την ταυτότητά σου",
          points: [
            "Σχεδίασε poster με λογότυπο, χρώματα & ωράριο",
            "Έτοιμα πρότυπα + σταγονόμετρο χρώματος",
            "Εξαγωγή σε PDF (A4) για εκτύπωση ή PNG για social",
            "Το QR οδηγεί κατευθείαν στη σελίδα κράτησής σου",
          ],
        },
        {
          icon: UserCog,
          title: "Διαχείριση προσωπικού",
          points: [
            "Ατομικά ωράρια & σπαστές βάρδιες",
            "Ρεπό, άδειες & αναρρωτικές",
            "Ανάθεση υπηρεσιών & χρώμα ανά άτομο",
            "Διαθεσιμότητα ανά υπάλληλο σε πραγματικό χρόνο",
          ],
        },
        {
          icon: Star,
          title: "Πελάτες & κριτικές",
          points: [
            "Προφίλ πελατών με ιστορικό & αγαπημένα",
            "Κριτικές ανά υπάλληλο με δική σου απάντηση",
            "Αναφορά & αποκλεισμός προβληματικών πελατών",
            "Παρακολούθηση των απουσιών (no-show)",
          ],
        },
        {
          icon: BarChart3,
          title: "Αναφορές & analytics",
          points: [
            "Έσοδα & πλήθος κρατήσεων ανά περίοδο",
            "Πόσα ραντεβού ήρθαν από την ιστοσελίδα & πόσα καταχώρησες χειροκίνητα",
            "Ποσοστό μη εμφανίσεων",
            "Δημοφιλείς υπηρεσίες & απόδοση προσωπικού",
          ],
        },
      ]
    : [
        {
          icon: CalendarCheck,
          title: "24/7 online booking",
          points: [
            "Customers book themselves, even after hours",
            "Pick service, day, time and staff member",
            "They scan the door QR or open your link",
            "They find you again without the QR, from their appointments, favorites or search",
            "Automatic double-booking prevention",
          ],
        },
        {
          icon: CalendarDays,
          title: "Smart calendar",
          points: [
            "Day, week & month views",
            "A column per staff member",
            "Drag & drop to reschedule, resize to change duration",
            "Quick walk-in entry",
          ],
        },
        {
          icon: QrCode,
          title: "Branded QR poster",
          points: [
            "Design a poster with your logo, colors & hours",
            "Ready-made templates + color eyedropper",
            "Export to PDF (A4) for print or PNG for social",
            "The QR leads straight to your booking page",
          ],
        },
        {
          icon: UserCog,
          title: "Staff management",
          points: [
            "Per-staff schedules & split shifts",
            "Days off, leave & sick days",
            "Assign services & a color per person",
            "Real-time availability per staff member",
          ],
        },
        {
          icon: Star,
          title: "Customers & reviews",
          points: [
            "Customer profiles with history & favorites",
            "Per-staff reviews with your reply",
            "Report & block problematic customers",
            "No-show tracking",
          ],
        },
        {
          icon: BarChart3,
          title: "Reports & analytics",
          points: [
            "Revenue & booking counts per period",
            "How many bookings came from the website vs entered manually",
            "No-show rate",
            "Popular services & staff performance",
          ],
        },
      ];

  const splitGroups = detailGroups.slice(0, 2);
  const gridGroups = detailGroups.slice(2);

  return (
    <>
      {/* ──────────── HERO ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <Reveal y={20}>
                <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
                  {dict.nav.forBusiness}
                </span>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-7 max-w-[16ch] font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  {isEl
                    ? "Γέμισε το πρόγραμμά σου με ραντεβού"
                    : "Fill your schedule with bookings"}
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
                  {dict.hero.subtitle}
                </p>
              </Reveal>
              <Reveal delay={0.24}>
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
                    <Link href="#pricing">{dict.nav.pricing}</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="flex justify-center lg:col-span-6 lg:justify-end lg:pr-6">
              <BrowserShot
                src="/tour/dash-calendar.png"
                width={1440}
                height={900}
                alt={isEl ? "Το ημερολόγιο του Qlick" : "The Qlick calendar"}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ──────────── FEATURES IN DETAIL ──────────── */}
      <section className="py-24 md:py-32">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {detailIntro}
            </h2>
          </Reveal>

          {/* two hero features as split rows */}
          <div className="mt-16 space-y-16 md:space-y-24">
            {splitGroups.map((g, gi) => {
              const Icon = g.icon;
              const flip = gi % 2 === 1;
              return (
                <div
                  key={g.title}
                  className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  <Reveal className={flip ? "lg:order-2" : undefined}>
                    <div className="inline-flex size-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-6" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {g.title}
                    </h3>
                  </Reveal>
                  <Reveal delay={0.12} className={flip ? "lg:order-1" : undefined}>
                    <ul className="divide-y divide-border/70">
                      {g.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-3 py-3.5 text-base leading-relaxed text-muted first:pt-0 last:pb-0"
                        >
                          <Check className="mt-1 size-4 shrink-0 text-gold" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>
              );
            })}
          </div>

          {/* remaining four as a compact 2x2 grid */}
          <div className="mt-16 grid gap-5 md:mt-24 md:grid-cols-2">
            {gridGroups.map((g, gi) => {
              const Icon = g.icon;
              return (
                <Reveal key={g.title} delay={(gi % 2) * 0.1}>
                  <div className="group h-full rounded-3xl border border-border bg-surface p-8 elev-card transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out)] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]">
                    <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-110">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
                      {g.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {g.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2 text-sm leading-relaxed text-muted"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── HOW IT WORKS — slim strip ──────────── */}
      <section className="border-t border-border bg-surface/30 py-20 md:py-24">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {dict.howItWorks.title}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {dict.howItWorks.steps.map((step, idx) => (
              <Reveal key={step.number} delay={idx * 0.12}>
                <div className="flex gap-5">
                  <span className="font-display text-5xl font-extrabold leading-none text-gold/30">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ──────────── PRICING ──────────── */}
      <PricingSection locale={locale} pricing={dict.pricing} />

      {/* ──────────── FINAL CTA ──────────── */}
      <section className="border-t border-border py-24 md:py-32">
        <Container size="md">
          <Reveal>
            <div className="bg-gold-glow relative overflow-hidden rounded-3xl border border-gold/30 p-12 text-center md:p-16">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {dict.cta.title}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
                {dict.cta.subtitle}
              </p>
              <div className="mt-8 flex justify-center">
                <Magnetic>
                  <Button asChild size="xl">
                    <Link href={`/${locale}/signup/business`}>
                      {dict.cta.primary}
                      <ArrowRight className="ml-1" />
                    </Link>
                  </Button>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
