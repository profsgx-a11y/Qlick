import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://www.qlick.gr";
const LOCALES = ["el", "en"] as const;
// Public marketing paths worth indexing (relative to /{locale}).
const STATIC_PATHS = [
  "",
  "/for-business",
  "/search",
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

  // Active shop pages (skip drafts, suspended, and ones pending deletion).
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
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
