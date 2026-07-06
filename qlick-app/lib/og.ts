import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Shared helpers for the dynamically generated Open Graph / Twitter share
 * images (see the colocated `opengraph-image.tsx` routes). Kept framework-free
 * so both the site-wide and per-shop images reuse the same fonts + data.
 */

export const OG_SIZE = { width: 1200, height: 630 };

// Brand palette for the share cards (Qlick dark + gold), independent of the
// runtime CSS tokens which aren't available inside satori.
export const OG_BG = "#0b0b0b";
export const OG_GOLD = "#d4a857";
export const OG_MUTED = "#8a8a8a";

type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};
let fontsCache: OgFont[] | null = null;

export async function ogFonts(): Promise<OgFont[]> {
  if (!fontsCache) {
    const [regular, bold] = await Promise.all([
      readFile(join(process.cwd(), "assets/NotoSans-Regular.ttf")),
      readFile(join(process.cwd(), "assets/NotoSans-Bold.ttf")),
    ]);
    fontsCache = [
      { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
      { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
    ];
  }
  return fontsCache;
}

export type OgBusiness = {
  name: string;
  logoUrl: string | null;
  accent: string;
};

/** Public (anon) read of an active business for its share card. */
export async function ogBusiness(slug: string): Promise<OgBusiness | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await supabase
    .from("businesses")
    .select("name, logo_url, brand_colors, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  const accent =
    (data.brand_colors as { accent?: string } | null)?.accent || OG_GOLD;
  return {
    name: data.name as string,
    logoUrl: (data.logo_url as string | null) ?? null,
    accent,
  };
}

/** Fetch a logo as raw bytes for embedding in an ImageResponse `<img>`. */
export async function ogFetchImage(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
