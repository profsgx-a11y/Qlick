import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { hasLocale } from "@/i18n/config";

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <div className="bg-gold-glow relative flex min-h-screen flex-col">
      <div className="bg-hero-grid pointer-events-none absolute inset-0" />
      <header className="relative flex items-center justify-between px-6 py-5 md:px-10">
        <Link href={`/${locale}`} className="flex items-center">
          <Logo />
        </Link>
        <LanguageSwitcher current={locale} />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 py-10">
        {children}
      </main>

      <footer className="relative py-6 text-center text-xs text-muted-2">
        © {new Date().getFullYear()} Qlick
      </footer>
    </div>
  );
}
