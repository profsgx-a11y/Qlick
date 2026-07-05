import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Store, User } from "lucide-react";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";

export default async function SignupChooserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].chooser;

  const cards = [
    {
      href: `/${loc}/signup/customer`,
      icon: User,
      title: dict.customerTitle,
      desc: dict.customerDesc,
      cta: dict.customerCta,
    },
    {
      href: `/${loc}/signup/business`,
      icon: Store,
      title: dict.businessTitle,
      desc: dict.businessDesc,
      cta: dict.businessCta,
    },
  ];

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {dict.title}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{dict.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            style={{ animationDelay: `${i * 80}ms` }}
            className="group flex animate-rise flex-col rounded-2xl border border-border bg-surface p-6 elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
          >
            <span className="inline-flex size-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-110">
              <c.icon className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
              {c.title}
            </h2>
            <p className="mt-1.5 flex-1 text-sm text-muted">{c.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold">
              {c.cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        {dict.haveAccount}{" "}
        <Link
          href={`/${loc}/login`}
          className="font-medium text-gold hover:underline"
        >
          {dict.logIn}
        </Link>
      </p>
    </div>
  );
}
