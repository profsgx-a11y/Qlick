import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { getDictionary, hasLocale } from "@/i18n/config";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      {/* Fonts used by the showcased QR poster SVG */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Montserrat:wght@500;600;700;800&family=Oswald:wght@500;700&family=Playfair+Display:ital,wght@0,700;1,500&family=Poppins:wght@600;800&display=swap"
      />
      <Header locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} dict={dict} />
    </>
  );
}
