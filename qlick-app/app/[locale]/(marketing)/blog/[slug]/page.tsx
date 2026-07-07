import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal, Magnetic } from "@/components/motion/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { guides, getGuide } from "@/lib/guides";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return ["el", "en"].flatMap((locale) =>
    guides.map((g) => ({ locale, slug: g.slug })),
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const c = locale !== "en" ? guide.el : guide.en;
  return pageMetadata(locale, `/blog/${slug}`, c.title, c.excerpt);
}

export default async function GuidePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const guide = getGuide(slug);
  if (!guide) notFound();
  const isEl = locale !== "en";
  const c = isEl ? guide.el : guide.en;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.excerpt,
    datePublished: guide.date,
    dateModified: guide.date,
    inLanguage: isEl ? "el" : "en",
    mainEntityOfPage: `https://www.qlick.gr/${locale}/blog/${slug}`,
    author: { "@type": "Organization", name: "Qlick" },
    publisher: {
      "@type": "Organization",
      name: "Qlick",
      logo: {
        "@type": "ImageObject",
        url: "https://www.qlick.gr/icon.png",
      },
    },
  };

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(isEl ? "el-GR" : "en-GB", {
      dateStyle: "long",
    }).format(new Date(iso));

  return (
    <>
      <JsonLd data={articleSchema} />
      <article className="py-14 md:py-20">
        <Container size="md">
          <Reveal>
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {isEl ? "Όλοι οι οδηγοί" : "All guides"}
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-8 text-xs font-medium uppercase tracking-widest text-gold">
              {fmtDate(guide.date)}
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              {c.title}
            </h1>
          </Reveal>

          <div className="mt-10 space-y-8">
            {c.sections.map((s, i) => (
              <Reveal key={i} delay={0.04 * i}>
                <div>
                  {s.h && (
                    <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
                      {s.h}
                    </h2>
                  )}
                  {s.p.map((para, pi) => (
                    <p
                      key={pi}
                      className="mt-3 text-base leading-relaxed text-muted"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-14 flex flex-wrap items-center gap-4 rounded-3xl border border-gold/30 bg-gold-glow p-8">
              <p className="flex-1 text-lg font-semibold text-foreground">
                {isEl
                  ? "Ξεκίνα να δέχεσαι online ραντεβού — 3 μήνες δωρεάν."
                  : "Start taking online bookings — 3 months free."}
              </p>
              <Magnetic>
                <Button asChild size="lg">
                  <Link href={`/${locale}/signup/business`}>
                    {isEl ? "Ξεκίνα δωρεάν" : "Start free"}
                    <ArrowRight className="ml-1" />
                  </Link>
                </Button>
              </Magnetic>
            </div>
          </Reveal>
        </Container>
      </article>
    </>
  );
}
