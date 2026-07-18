import type { Metadata } from "next";

/**
 * Builds per-page metadata with a canonical URL and el/en hreflang alternates
 * (resolved against metadataBase → https://qlick.gr). `path` is the route
 * without the locale prefix, e.g. "/for-business" or "" for the homepage.
 */
export function pageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string,
): Metadata {
  const withLocale = (loc: string) => `/${loc}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: withLocale(locale),
      languages: {
        el: withLocale("el"),
        en: withLocale("en"),
        "x-default": withLocale("el"),
      },
    },
    openGraph: { title: `${title} · Qlick`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} · Qlick`, description },
  };
}
