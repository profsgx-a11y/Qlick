import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/primitives";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { guides } from "@/lib/guides";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  const isEl = locale !== "en";
  return pageMetadata(
    locale,
    "/blog",
    isEl ? "Οδηγοί & άρθρα" : "Guides & articles",
    isEl
      ? "Οδηγοί για online ραντεβού, QR κρατήσεις και διαχείριση επιχείρησης — από την ομάδα του Qlick."
      : "Guides on online booking, QR bookings and running your business — from the Qlick team.",
  );
}

export default async function BlogIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isEl = locale !== "en";
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(isEl ? "el-GR" : "en-GB", {
      dateStyle: "long",
    }).format(new Date(iso));

  return (
    <>
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-14 md:pt-20 md:pb-16">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <Reveal>
            <h1 className="font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {isEl ? "Οδηγοί & άρθρα" : "Guides & articles"}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {isEl
                ? "Πρακτικοί οδηγοί για online ραντεβού, QR κρατήσεις και το πώς να μεγαλώσεις την επιχείρησή σου."
                : "Practical guides on online booking, QR bookings and growing your business."}
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container size="xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((g, i) => {
              const c = isEl ? g.el : g.en;
              return (
                <Reveal key={g.slug} delay={(i % 3) * 0.08}>
                  <Link
                    href={`/${locale}/blog/${g.slug}`}
                    className="group flex h-full flex-col rounded-3xl border border-border bg-surface p-7 transition-[border-color,box-shadow] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                  >
                    <p className="text-xs font-medium uppercase tracking-widest text-gold">
                      {fmtDate(g.date)}
                    </p>
                    <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground">
                      {c.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                      {c.excerpt}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold">
                      {isEl ? "Διάβασε" : "Read"}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
