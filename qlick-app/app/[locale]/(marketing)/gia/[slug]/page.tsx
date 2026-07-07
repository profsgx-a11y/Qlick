import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CalendarClock, ShieldCheck, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic } from "@/components/motion/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { industryCopy } from "@/lib/industries";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string; slug: string }>;

async function loadCategory(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name_el, name_en")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateStaticParams() {
  // Build-time: no request context, so use a cookie-less anon client.
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await supabase.from("categories").select("slug");
  const slugs = (data ?? []).map((c) => c.slug);
  return ["el", "en"].flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) return {};
  const copy = industryCopy(locale, cat.name_el, cat.name_en);
  return pageMetadata(
    locale,
    `/gia/${slug}`,
    copy.metaTitle,
    copy.metaDescription,
  );
}

export default async function IndustryPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const cat = await loadCategory(slug);
  if (!cat) notFound();
  const isEl = locale !== "en";
  const copy = industryCopy(locale, cat.name_el, cat.name_en);

  const supabase = await createClient();
  const { data: bcRows } = await supabase
    .from("business_categories")
    .select("business_id")
    .eq("category_id", cat.id);
  const ids = (bcRows ?? []).map((r) => r.business_id);
  const orFilter = `category_id.eq.${cat.id}${
    ids.length ? `,id.in.(${ids.join(",")})` : ""
  }`;
  const { data: bizRows } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, address")
    .eq("status", "active")
    .is("deletion_scheduled_at", null)
    .or(orFilter)
    .limit(24);
  const businesses = bizRows ?? [];

  const benefitIcons = [CalendarClock, Clock, ShieldCheck];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />

      {/* Hero */}
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold">
              {isEl ? cat.name_el : cat.name_en}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {copy.heading}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {copy.intro}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Button asChild size="xl">
                  <Link href={`/${locale}/search?cat=${slug}`}>
                    {isEl ? "Βρες κατάστημα" : "Find a business"}
                    <ArrowRight className="ml-1" />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild variant="secondary" size="xl">
                <Link href={`/${locale}/signup/business`}>
                  {isEl ? "Είμαι επιχείρηση" : "I'm a business"}
                </Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <Container size="xl">
          <div className="grid gap-6 md:grid-cols-3">
            {copy.benefits.map((b, i) => {
              const Icon = benefitIcons[i] ?? CalendarClock;
              return (
                <Reveal key={b.title} delay={i * 0.1}>
                  <div className="h-full rounded-3xl border border-border bg-surface p-8 elev-card">
                    <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                      {b.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted">{b.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Businesses in this category */}
      {businesses.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <Container size="xl">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEl
                  ? `${cat.name_el} στο Qlick`
                  : `${cat.name_en} on Qlick`}
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b, i) => {
                const addr = (b.address ?? {}) as { city?: string };
                return (
                  <Reveal key={b.id} delay={(i % 3) * 0.08}>
                    <Link
                      href={`/${locale}/b/${b.slug}`}
                      className="flex h-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-[border-color,box-shadow] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                    >
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
                        {b.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logo_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-gold">
                            {b.name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">
                          {b.name}
                        </span>
                        {addr.city && (
                          <span className="block truncate text-sm text-muted">
                            {addr.city}
                          </span>
                        )}
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* For owners */}
      <section className="border-t border-border bg-surface/30 py-16 md:py-24">
        <Container size="md">
          <Reveal>
            <div className="rounded-3xl border border-gold/30 bg-gold-glow p-10 text-center md:p-14">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEl ? "Είσαι επαγγελματίας;" : "Are you a professional?"}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
                {copy.forOwners}
              </p>
              <div className="mt-8 flex justify-center">
                <Magnetic>
                  <Button asChild size="xl">
                    <Link href={`/${locale}/signup/business`}>
                      {isEl ? "Ξεκίνα δωρεάν" : "Start free"}
                      <ArrowRight className="ml-1" />
                    </Link>
                  </Button>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-16 md:py-24">
        <Container size="md">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {isEl ? "Συχνές ερωτήσεις" : "Frequently asked questions"}
            </h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {copy.faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.06}>
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <h3 className="flex items-start gap-2 font-semibold text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                    {f.q}
                  </h3>
                  <p className="mt-2 pl-6 text-sm leading-relaxed text-muted">
                    {f.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
