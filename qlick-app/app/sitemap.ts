import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { guides } from "@/lib/guides";

const BASE = "https://qlick.gr";
const LOCALES = ["el", "en"] as const;
// Public marketing paths worth indexing (relative to /{locale}).
const STATIC_PATHS = [
  "",
  "/tour",
  "/for-business",
  "/search",
  "/gia",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
];

// Refresh the shop list into the sitemap hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${BASE}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }

  // Guides / blog articles.
  for (const g of guides) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE}/${locale}/blog/${g.slug}`,
        lastModified: g.date,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Industry landing pages (one per category).
    const { data: cats } = await supabase.from("categories").select("slug");
    for (const c of cats ?? []) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE}/${locale}/gia/${c.slug}`,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    // Active shop pages (skip drafts, suspended, and ones pending deletion).
    const { data } = await supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("status", "active")
      .is("deletion_scheduled_at", null);

    for (const b of data ?? []) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE}/${locale}/b/${b.slug}`,
          lastModified: b.updated_at ?? undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // On any failure, still return the static entries.
  }

  return entries;
}
