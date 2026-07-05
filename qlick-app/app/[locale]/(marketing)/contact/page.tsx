import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Clock, Headset, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic } from "@/components/motion/primitives";
import { getDictionary, hasLocale } from "@/i18n/config";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const isEl = locale === "el";

  // Placeholder contact email — to be finalized before public launch.
  const email = "info@qlick.gr";

  const cards = [
    {
      icon: Mail,
      title: isEl ? "Στείλε μας email" : "Email us",
      lines: [email],
      hint: isEl
        ? "Ο πιο γρήγορος τρόπος να μας βρεις."
        : "The fastest way to reach us.",
      href: `mailto:${email}`,
    },
    {
      icon: Headset,
      title: isEl ? "Υποστήριξη" : "Support",
      lines: [isEl ? "Για πελάτες & επαγγελματίες" : "For customers & businesses"],
      hint: isEl
        ? "Σε βοηθάμε με λογαριασμό, κρατήσεις και QR."
        : "We help with account, bookings and QR.",
    },
    {
      icon: Clock,
      title: isEl ? "Ώρες" : "Hours",
      lines: [isEl ? "Δευτέρα-Παρασκευή" : "Monday-Friday", "09:00-18:00"],
      hint: isEl
        ? "Απαντάμε συνήθως εντός 1 εργάσιμης ημέρας."
        : "We usually reply within 1 business day.",
    },
  ];

  return (
    <>
      {/* ──────────── HERO ──────────── */}
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-20 md:pt-20 md:pb-24">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <div className="max-w-2xl">
            <Reveal y={20}>
              <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold [box-shadow:var(--glow-nav)]">
                {isEl ? "Επικοινωνία" : "Contact"}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {isEl ? "Είμαστε εδώ για σένα" : "We're here to help"}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
                {isEl
                  ? "Έχεις ερώτηση, ιδέα ή θέλεις βοήθεια με το κατάστημά σου; Γράψε μας. Χαιρόμαστε να ακούμε από επαγγελματίες και πελάτες."
                  : "Have a question, an idea, or need help with your shop? Drop us a line. We love hearing from businesses and customers."}
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ──────────── CONTACT PANEL ──────────── */}
      <section className="py-20 md:py-28">
        <Container size="xl">
          <Reveal>
            <div className="surface-raise grid overflow-hidden rounded-3xl border border-border elev-card md:grid-cols-3 md:divide-x md:divide-border/70">
              {cards.map((c) => {
                const Icon = c.icon;
                const inner = (
                  <div className="p-8 md:p-10">
                    <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {c.title}
                    </h2>
                    <div className="mt-1 space-y-0.5">
                      {c.lines.map((l) => (
                        <p key={l} className="font-medium text-gold">
                          {l}
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {c.hint}
                    </p>
                  </div>
                );
                return c.href ? (
                  <a
                    key={c.title}
                    href={c.href}
                    className="block border-b border-border/70 transition-colors duration-300 hover:bg-surface-2/60 md:border-b-0"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={c.title} className="border-b border-border/70 last:border-b-0 md:border-b-0">
                    {inner}
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* ──────────── CTA ──────────── */}
          <Reveal delay={0.1}>
            <div className="bg-gold-glow relative mt-16 overflow-hidden rounded-3xl border border-gold/30 p-10 text-center md:p-14">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEl ? "Έτοιμος να ξεκινήσεις;" : "Ready to get started?"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                {isEl
                  ? "Φτιάξε το κατάστημά σου στο Qlick σε λίγα λεπτά. Δωρεάν για να ξεκινήσεις."
                  : "Set up your shop on Qlick in minutes. Free to start."}
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
