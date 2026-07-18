import type { MetadataRoute } from "next";

/**
 * /robots.txt — lets search engines crawl the public site, keeps private
 * areas (dashboard, account, admin, api) out, and points at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/dashboard", "/*/account", "/*/admin"],
    },
    sitemap: "https://qlick.gr/sitemap.xml",
    host: "https://qlick.gr",
  };
}
