import { Container } from "@/components/ui/container";

export interface LegalSection {
  heading: string;
  /** One or more paragraphs. */
  body: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

/** Shared layout for Terms / Privacy / Cookies pages (premium dark, readable column). */
export function LegalPage({ eyebrow, title, updated, intro, sections }: LegalPageProps) {
  return (
    <>
      <section className="bg-gold-glow relative overflow-hidden border-b border-border py-16 md:py-20">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="md" className="relative">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold">
            {eyebrow}
          </span>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-muted-2">{updated}</p>
          <p className="mt-6 text-lg leading-relaxed text-muted">{intro}</p>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container size="md">
          <div className="space-y-10">
            {sections.map((s, i) => (
              <div
                key={i}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
              >
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  {i + 1}. {s.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-sm leading-relaxed text-muted md:text-base">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
