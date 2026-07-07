import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/primitives";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  const isEl = locale !== "en";
  return pageMetadata(
    locale,
    "/gia",
    isEl ? "Κλάδοι — Online ραντεβού" : "Industries — Online booking",
    isEl
      ? "Κλείσε online ραντεβού σε κομμωτήρια, κουρεία, ιατρεία, γυμναστήρια και δεκάδες ακόμη κλάδους μέσω Qlick."
      : "Book online appointments at hair salons, barbers, clinics, gyms and dozens more industries with Qlick.",
  );
}

export default async function IndustriesHubPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isEl = locale !== "en";

  const supabase = await createClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug, name_el, name_en, parent_id, order_index")
    .order("order_index");
  const all = cats ?? [];
  const name = (c: { name_el: string; name_en: string | null }) =>
    isEl ? c.name_el : c.name_en || c.name_el;

  const parents = all.filter((c) => !c.parent_id);
  const groups = parents
    .map((p) => ({
      label: name(p),
      children: all.filter((c) => c.parent_id === p.id),
    }))
    .filter((g) => g.children.length > 0);

  return (
    <>
      <section className="bg-gold-glow relative overflow-hidden border-b border-border pt-14 pb-14 md:pt-20 md:pb-16">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" />
        <Container size="xl" className="relative">
          <Reveal>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {isEl ? "Online ραντεβού για κάθε κλάδο" : "Online booking for every industry"}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {isEl
                ? "Διάλεξε κλάδο και κλείσε ραντεβού online — ή δέξου κρατήσεις για την επιχείρησή σου."
                : "Pick an industry and book online — or take bookings for your own business."}
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container size="xl">
          <div className="space-y-14">
            {groups.map((g, gi) => (
              <Reveal key={g.label} delay={(gi % 3) * 0.06}>
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    {g.label}
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.children.map((c) => (
                      <Link
                        key={c.id}
                        href={`/${locale}/gia/${c.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 transition-[border-color,box-shadow] hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                      >
                        <span className="font-medium text-foreground">
                          {name(c)}
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-2 transition-colors group-hover:text-gold" />
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
