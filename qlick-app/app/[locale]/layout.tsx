import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sofia_Sans, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, hasLocale, locales } from "@/i18n/config";
import { DictProvider } from "@/i18n/provider";

type LocaleParams = { params: Promise<{ locale: string }> };

const inter = Inter({
  subsets: ["latin", "greek", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Display family — used for headings & big numbers (Greek-capable, variable).
// Swap this single import to change the whole "voice" of the UI.
// Sofia Sans: strong grotesque with first-class Greek glyphs (Syne's Greek
// letterforms looked warped/stretched, so it was replaced).
const sofiaSans = Sofia_Sans({
  subsets: ["latin", "greek", "latin-ext"],
  variable: "--font-sofia",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Emits <meta name="color-scheme" content="dark"> → the official opt-out from
// Chromium auto-dark-mode (Brave/Chrome/Edge), so our own dark theme + the QR
// poster's true colors render identically to Safari.
export const viewport: Viewport = {
  colorScheme: "dark",
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: { default: dict.meta.title, template: "%s · Qlick" },
    description: dict.meta.description,
    // Canonical serving domain (apex; www 308-redirects here), so canonical,
    // OG/Twitter image URLs resolve directly with no redirect.
    metadataBase: new URL("https://qlick.gr"),
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
      siteName: "Qlick",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${sofiaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DictProvider dict={dict}>{children}</DictProvider>
      </body>
    </html>
  );
}
