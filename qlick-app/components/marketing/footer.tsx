import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/brand/logo";
import type { Locale, Dictionary } from "@/i18n/config";

interface FooterProps {
  locale: Locale;
  dict: Dictionary;
}

export function Footer({ locale, dict }: FooterProps) {
  const year = new Date().getFullYear();
  const groups = [
    {
      title: dict.footer.product,
      links: [
        { href: `/${locale}#features`, label: dict.footer.links.features },
        { href: `/${locale}#pricing`, label: dict.footer.links.pricing },
        { href: `/${locale}/qr-editor`, label: dict.footer.links.qrEditor },
      ],
    },
    {
      title: dict.footer.company,
      links: [
        { href: `/${locale}/about`, label: dict.footer.links.about },
        { href: `/${locale}/contact`, label: dict.footer.links.contact },
      ],
    },
    {
      title: dict.footer.legal,
      links: [
        { href: `/${locale}/terms`, label: dict.footer.links.terms },
        { href: `/${locale}/privacy`, label: dict.footer.links.privacy },
        { href: `/${locale}/cookies`, label: dict.footer.links.cookies },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface/40 py-16">
      <Container size="xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-2">
          {dict.footer.copyright.replace("{year}", String(year))}
        </div>

        {/* Oversized wordmark — brand sign-off at the very bottom */}
        <div
          aria-hidden
          className="pointer-events-none mt-10 select-none overflow-hidden"
        >
          <p className="bg-gradient-to-b from-surface-3 to-transparent bg-clip-text text-center font-display text-[clamp(5rem,18vw,17rem)] font-extrabold leading-[0.9] tracking-tight text-transparent">
            Qlick
          </p>
        </div>
      </Container>
    </footer>
  );
}
