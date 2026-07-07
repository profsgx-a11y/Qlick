import Link from "next/link";
import { notFound } from "next/navigation";
import {
  QrCode,
  Languages,
  BadgeEuro,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic, Parallax, TiltCard } from "@/components/motion/primitives";
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
    "/about",
    isEl ? "Σχετικά με εμάς" : "About us",
    isEl
      ? "Το Qlick είναι η ελληνική πλατφόρμα online ραντεβού με QR — απλή, γρήγορη και δίγλωσση."
      : "Qlick is the Greek QR-first online booking platform — simple, fast and bilingual.",
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const isEl = locale === "el";

  const values: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    text: string;
  }[] = isEl
    ? [
        {
          icon: QrCode,
          title: "QR στην καρδιά",
          text: "Ένα poster στην πόρτα, ένα σκανάρισμα, ένα ραντεβού. Χωρίς τηλέφωνα, χωρίς αναμονή.",
        },
        {
          icon: Languages,
          title: "Ελληνικά πρώτα",
          text: "Φτιαγμένο για την ελληνική αγορά, με πλήρη υποστήριξη Ελληνικών & Αγγλικών για σένα και τους πελάτες σου.",
        },
        {
          icon: BadgeEuro,
          title: "0% προμήθεια",
          text: "Δεν παίρνουμε ποσοστό από τις κρατήσεις σου. Οι πελάτες πληρώνουν απευθείας στο κατάστημα.",
        },
        {
          icon: ShieldCheck,
          title: "Δεδομένα στην ΕΕ",
          text: "Τα δεδομένα φιλοξενούνται σε servers της Ευρωπαϊκής Ένωσης, με σεβασμό στο απόρρητο.",
        },
        {
          icon: Smartphone,
          title: "Από το κινητό",
          text: "Πελάτες και υπάλληλοι, όλα από το κινητό. Καμία εφαρμογή να κατεβάσει κανείς.",
        },
        {
          icon: Sparkles,
          title: "Απλό & σύγχρονο",
          text: "Έτοιμο σε λίγα λεπτά, χωρίς εκπαίδευση και χωρίς περίπλοκα μενού.",
        },
      ]
    : [
        {
          icon: QrCode,
          title: "QR at the core",
          text: "A poster on the door, one scan, one booking. No phone calls, no waiting.",
        },
        {
          icon: Languages,
          title: "Greek-first",
          text: "Built for the Greek market, with full Greek & English support for you and your customers.",
        },
        {
          icon: BadgeEuro,
          title: "0% commission",
          text: "We take no cut of your bookings. Customers pay directly at the shop.",
        },
        {
          icon: ShieldCheck,
          title: "Data in the EU",
          text: "Data is hosted on European Union servers, with respect for privacy.",
        },
        {
          icon: Smartphone,
          title: "From the phone",
          text: "Customers and staff, all from a phone. No app to download.",
        },
        {
          icon: Sparkles,
          title: "Simple & modern",
          text: "Ready in minutes, with no training and no complicated menus.",
        },
      ];

  const story: string[] = isEl
    ? [
        "Οι μικρές επιχειρήσεις χάνουν ραντεβού όταν χτυπάει το τηλέφωνο την ώρα της δουλειάς, μπερδεύονται με χειρόγραφα ημερολόγια και ακυρώσεις της τελευταίας στιγμής. Οι μεγάλες πλατφόρμες κρατήσεων είναι ακριβές, πολύπλοκες και συχνά κρατάνε προμήθεια.",
        "Πιστεύουμε ότι κάθε επαγγελματίας αξίζει ένα εργαλείο που είναι γρήγορο, κατανοητό και δίκαιο. Γι' αυτό βάλαμε το QR poster στο κέντρο: ο πελάτης σκανάρει, βλέπει διαθεσιμότητα και κλείνει. Χωρίς εφαρμογή, χωρίς τηλέφωνα, χωρίς τριβή.",
        "Πίσω από το σκανάρισμα υπάρχει ένα πλήρες σύστημα: ημερολόγιο, υπάλληλοι, υπηρεσίες, ωράρια, κριτικές και αναφορές. Όλα σε ένα, σχεδιασμένα για κινητό.",
        "Και το πιο σημαντικό: το QR είναι μόνο η πρώτη γνωριμία. Μόλις κλείσει μία φορά, ο πελάτης σε ξαναβρίσκει από τον λογαριασμό του, στα ραντεβού του, στα αγαπημένα ή στην αναζήτηση, και ξανακλείνει χωρίς να χρειαστεί να περάσει ξανά από το κατάστημα.",
      ]
    : [
        "Small businesses lose appointments when the phone rings mid-work, struggle with paper diaries and last-minute cancellations. Big booking platforms are expensive, complex and often take a commission.",
        "We believe every professional deserves a tool that is fast, clear and fair. That's why we put the QR poster at the center: the customer scans, sees availability and books. No app, no phone calls, no friction.",
        "Behind the scan sits a complete system: calendar, staff, services, hours, reviews and reports. All in one, designed for mobile.",
        "And most importantly: the QR is only the first meeting. Once they have booked once, the customer finds you again from their account, in their appointments, favorites or search, and rebooks without having to drop by the shop again.",
      ];

  return (
    <>
      {/* ──────────── HERO ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-20 md:pt-20 md:pb-24">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <div className="max-w-3xl">
            <Reveal y={20}>
              <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
                {isEl ? "Σχετικά" : "About"}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {isEl ? "Οι κρατήσεις, απλές." : "Bookings, made simple."}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
                {isEl
                  ? "Το Qlick είναι μια πλατφόρμα online κρατήσεων για επιχειρήσεις που λειτουργούν με ραντεβού. Ο πελάτης σε ανακαλύπτει σκανάροντας το QR στην πόρτα και ξανακλείνει σε δευτερόλεπτα μέσα από τον λογαριασμό του."
                  : "Qlick is an online booking platform for appointment-based businesses. Customers discover you by scanning the QR on the door and rebook in seconds through their account."}
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ──────────── STORY ──────────── */}
      <section className="py-20 md:py-28">
        <Container size="md">
          <Reveal>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {isEl ? "Γιατί φτιάξαμε το Qlick" : "Why we built Qlick"}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-muted md:text-lg">
            {story.map((p, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ──────────── YOUR PUBLIC PAGE ──────────── */}
      <section className="border-t border-border bg-surface/30 py-20 md:py-28">
        <Container size="xl">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <h2 className="max-w-xl font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEl
                  ? "Κάθε κατάστημα αποκτά τη δική του σελίδα"
                  : "Every business gets its own page"}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">
                {isEl
                  ? "Μόλις εγγραφείς, αποκτάς αυτόματα μια επώνυμη δημόσια σελίδα κράτησης: υπηρεσίες με τιμές, ωράριο λειτουργίας, κριτικές και κουμπί «Κλείσε». Αυτό ακριβώς ανοίγει ο πελάτης σου όταν σκανάρει το QR."
                  : "As soon as you sign up, you automatically get a branded public booking page: services with prices, opening hours, reviews and a “Book” button. This is exactly what your customer opens when they scan the QR."}
              </p>
              <div className="mt-8">
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/${locale}/b/barber-house`}>
                    {isEl ? "Δες ένα ζωντανό παράδειγμα" : "See a live example"}
                    <ArrowRight className="ml-1" />
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Parallax distance={26}>
              <Reveal delay={0.1}>
                <TiltCard max={5}>
                  <div className="relative">
                    <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gold/10 blur-3xl" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/shop-preview.png"
                      alt={
                        isEl
                          ? "Δημόσια σελίδα καταστήματος στο Qlick"
                          : "A business's public page on Qlick"
                      }
                      className="w-full rounded-2xl border border-border shadow-2xl shadow-black/50"
                    />
                  </div>
                </TiltCard>
              </Reveal>
            </Parallax>
          </div>
        </Container>
      </section>

      {/* ──────────── VALUES — borderless grid ──────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {isEl ? "Τι μας ξεχωρίζει" : "What sets us apart"}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.title} delay={(i % 3) * 0.08}>
                  <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {v.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {v.text}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <Container size="md">
          <Reveal>
            <div className="bg-gold-glow relative overflow-hidden rounded-3xl border border-gold/30 p-10 text-center md:p-14">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {dict.cta.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">{dict.cta.subtitle}</p>
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
