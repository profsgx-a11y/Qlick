import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Sparkles,
  Palette,
  Image as ImageIcon,
  Table,
  QrCode,
  Download,
  Monitor,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic, TiltCard } from "@/components/motion/primitives";
import { getDictionary, hasLocale } from "@/i18n/config";

export default async function QrEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const isEl = locale === "el";

  // Show the real editor output on the hero when the flat PNG exists.
  const posterPng = existsSync(join(process.cwd(), "public", "hero-poster.png"))
    ? "/hero-poster.png"
    : null;

  const features: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    points: string[];
  }[] = isEl
    ? [
        {
          icon: Sparkles,
          title: "Έτοιμα πρότυπα",
          points: [
            "Ξεκίνα από επαγγελματικά σχέδια, όχι από λευκή σελίδα",
            "Premium αισθητική (μαύρο & χρυσό) έτοιμη για χρήση",
            "Προσάρμοσε τα πάντα με λίγα κλικ",
          ],
        },
        {
          icon: Palette,
          title: "Χρώματα & ταυτότητα",
          points: [
            "Παλέτες χρωμάτων με ένα κλικ",
            "Σταγονόμετρο για να βρεις το ακριβές χρώμα του brand σου",
            "Γραμματοσειρές, μεγέθη και διάταξη στα μέτρα σου",
          ],
        },
        {
          icon: ImageIcon,
          title: "Λογότυπο & εικόνες",
          points: [
            "Ανέβασε το λογότυπό σου",
            "Τοποθέτησε, μεγέθυνε και ευθυγράμμισε με οδηγούς",
            "Εικονίδια (κλείσε / άλλαξε / ακύρωσε ραντεβού)",
          ],
        },
        {
          icon: Table,
          title: "Πίνακας ωραρίου",
          points: [
            "Το ωράριό σου μπαίνει αυτόματα από τις Ρυθμίσεις",
            "Σπαστές βάρδιες (πρωί/απόγευμα) & «ΚΛΕΙΣΤΑ»",
            "Στυλ πίνακα: περιγράμματα, γραμμές, χρώματα",
          ],
        },
        {
          icon: QrCode,
          title: "Έξυπνο QR",
          points: [
            "Δημιουργείται αυτόματα και οδηγεί στη σελίδα κράτησής σου",
            "Ο πελάτης σκανάρει και κλείνει ραντεβού σε δευτερόλεπτα",
            "Με την πρώτη κράτηση σε ξαναβρίσκει μετά από τον λογαριασμό του, χωρίς νέο σκανάρισμα",
            "Καταγράφεται ότι το ραντεβού ήρθε από το QR (αναφορές)",
          ],
        },
        {
          icon: Download,
          title: "Εξαγωγή PDF & PNG",
          points: [
            "Έτοιμο PDF σε μέγεθος A4 για εκτύπωση",
            "PNG υψηλής ανάλυσης για social media",
            "Αποθήκευσε και ξανακατέβασε όποτε θες",
          ],
        },
      ]
    : [
        {
          icon: Sparkles,
          title: "Ready-made templates",
          points: [
            "Start from professional designs, not a blank page",
            "Premium look (black & gold) ready to use",
            "Customize everything in a few clicks",
          ],
        },
        {
          icon: Palette,
          title: "Colors & identity",
          points: [
            "One-click color palettes",
            "Eyedropper to match your exact brand color",
            "Fonts, sizes and layout your way",
          ],
        },
        {
          icon: ImageIcon,
          title: "Logo & images",
          points: [
            "Upload your logo",
            "Position, resize and align with guides",
            "Icons (book / reschedule / cancel appointment)",
          ],
        },
        {
          icon: Table,
          title: "Opening-hours table",
          points: [
            "Your hours fill in automatically from Settings",
            "Split shifts (morning/afternoon) & “CLOSED”",
            "Table styling: borders, lines, colors",
          ],
        },
        {
          icon: QrCode,
          title: "Smart QR",
          points: [
            "Auto-generated and links to your booking page",
            "Customers scan and book in seconds",
            "After the first booking they find you again from their account, no new scan",
            "Bookings from the QR are tracked (reports)",
          ],
        },
        {
          icon: Download,
          title: "PDF & PNG export",
          points: [
            "Print-ready A4 PDF",
            "High-resolution PNG for social media",
            "Save and re-download anytime",
          ],
        },
      ];

  const steps: { n: string; title: string; text: string }[] = isEl
    ? [
        {
          n: "01",
          title: "Σχεδίασε",
          text: "Διάλεξε πρότυπο, βάλε λογότυπο, χρώματα και ωράριο.",
        },
        {
          n: "02",
          title: "Κατέβασε",
          text: "Εξαγωγή σε PDF (A4) για εκτύπωση ή PNG για social.",
        },
        {
          n: "03",
          title: "Βάλ' το στην πόρτα",
          text: "Οι πελάτες σκανάρουν και κλείνουν ραντεβού online.",
        },
      ]
    : [
        {
          n: "01",
          title: "Design",
          text: "Pick a template, add your logo, colors and hours.",
        },
        {
          n: "02",
          title: "Download",
          text: "Export to PDF (A4) for print or PNG for social.",
        },
        {
          n: "03",
          title: "Put it on the door",
          text: "Customers scan and book appointments online.",
        },
      ];

  return (
    <>
      {/* ──────────── HERO — the real editor output in 3D ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-20 md:pt-20 md:pb-24">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <Reveal y={20}>
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
                  <QrCode className="size-3.5" strokeWidth={2} />
                  {isEl ? "Το σήμα κατατεθέν μας" : "Our signature feature"}
                </span>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  {isEl ? "Ο QR Editor" : "The QR Editor"}
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
                  {isEl
                    ? "Σχεδίασε μόνος σου το poster που μπαίνει στην πόρτα του καταστήματός σου, με το λογότυπο, τα χρώματα και το ωράριό σου. Ένας editor τύπου Canva, φτιαγμένος ειδικά για το QR της κράτησης."
                    : "Design the poster that goes on your shop door yourself, with your logo, colors and hours. A Canva-style editor, built specifically for your booking QR."}
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
                    <Link href={`/${locale}#features`}>
                      {isEl ? "Όλες οι δυνατότητες" : "All features"}
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            {posterPng && (
              <div className="flex justify-center lg:col-span-5 lg:justify-end lg:pr-10">
                <Reveal delay={0.15} y={40}>
                  <div className="relative w-full max-w-[340px]">
                    <div className="absolute -inset-10 -z-10 rounded-[48px] bg-gold/15 blur-3xl" />
                    <TiltCard max={7}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterPng}
                        alt={isEl ? "Poster από τον QR Editor" : "Poster made in the QR Editor"}
                        className="aspect-[794/1123] w-full rounded-2xl object-cover shadow-2xl shadow-black/70 ring-1 ring-white/10"
                      />
                    </TiltCard>
                  </div>
                </Reveal>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ──────────── CAPABILITIES — airy borderless grid ──────────── */}
      <section className="py-24 md:py-32">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {isEl
                ? "Όλα όσα χρειάζεσαι για ένα poster που πουλάει"
                : "Everything you need for a poster that converts"}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i % 3) * 0.08}>
                  <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {f.title}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {f.points.map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-2 text-sm leading-relaxed text-muted"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ──────────── 3 STEPS — slim strip ──────────── */}
      <section className="border-t border-border bg-surface/30 py-20 md:py-24">
        <Container size="xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {isEl ? "Από το σχέδιο στην πόρτα" : "From design to door"}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, idx) => (
              <Reveal key={s.n} delay={idx * 0.12}>
                <div className="flex gap-5">
                  <span className="font-display text-5xl font-extrabold leading-none text-gold/30">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Desktop note (honest) */}
          <Reveal delay={0.2}>
            <div className="mt-12 flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
              <Monitor className="mt-0.5 size-5 shrink-0 text-gold" />
              <span>
                {isEl
                  ? "Ο editor αξιοποιείται καλύτερα από υπολογιστή, για ακρίβεια στο σχεδιασμό. Το έτοιμο poster, φυσικά, διαβάζεται από οποιοδήποτε κινητό."
                  : "The editor works best on a computer, for design precision. The finished poster, of course, scans from any phone."}
              </span>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="border-t border-border py-20 md:py-28">
        <Container size="md">
          <Reveal>
            <div className="bg-gold-glow relative overflow-hidden rounded-3xl border border-gold/30 p-10 text-center md:p-14">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEl ? "Φτιάξε το δικό σου QR poster" : "Create your own QR poster"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                {isEl
                  ? "Δωρεάν για να ξεκινήσεις. Έτοιμο poster σε λίγα λεπτά."
                  : "Free to start. A ready poster in minutes."}
              </p>
              <div className="mt-8 flex justify-center">
                <Magnetic>
                  <Button asChild size="xl">
                    <Link href={`/${locale}/signup/business`}>
                      {dict.hero.primaryCta}
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
