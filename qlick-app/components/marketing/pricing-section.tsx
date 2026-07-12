import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/primitives";
import type { Dictionary } from "@/i18n/config";

// Shared pricing section, rendered on both the landing page and /for-business
// so the plans, per-plan reassurance notes and the billing footnote stay in sync.
export function PricingSection({
  locale,
  pricing,
}: {
  locale: string;
  pricing: Dictionary["pricing"];
}) {
  return (
    <section id="pricing" className="border-t border-border py-24 md:py-32">
      <Container size="xl">
        <Reveal className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold">
            {pricing.eyebrow}
          </span>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {pricing.title}
          </h2>
          <p className="mt-4 text-lg text-muted">{pricing.subtitle}</p>
        </Reveal>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {pricing.plans.map((plan, i) => (
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
                    {pricing.popular}
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
                {plan.note && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-2">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold/70" />
                    <span>{plan.note}</span>
                  </p>
                )}
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

        {pricing.footnote && (
          <Reveal delay={0.15}>
            <p className="mx-auto mt-10 flex max-w-3xl items-start justify-center gap-2 text-center text-sm leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>{pricing.footnote}</span>
            </p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
