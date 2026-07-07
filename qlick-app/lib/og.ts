import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared helpers for the dynamically generated Open Graph / Twitter share
 * images (see the colocated `opengraph-image.tsx` routes). Kept framework-free
 * so both the site-wide and per-shop images reuse the same fonts + data.
 */

export const OG_SIZE = { width: 1200, height: 630 };

// Cache the generated share images (and their upstream reads) at the edge for
// a day. Without this the route is dynamic and re-renders on every scrape
// (~1.7s cold), which trips the short fetch timeout of Messenger/WhatsApp.
export const OG_REVALIDATE = 86400;

// Explicit CDN caching for the generated images. The route stays dynamic (ƒ),
// so `revalidate` alone doesn't cache it — these headers make Vercel's edge
// cache the PNG (s-maxage) and serve stale while revalidating, keeping scrapes
// instant after the first render.
export const OG_HEADERS = {
  "cache-control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

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

/**
 * Public (anon) read of an active business for its share card, via the
 * Supabase REST endpoint so the fetch is cacheable (keeps the image route
 * static/ISR instead of forcing it dynamic).
 */
export async function ogBusiness(slug: string): Promise<OgBusiness | null> {
  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const url =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/businesses` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=name,logo_url,brand_colors,status&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: OG_REVALIDATE },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as {
      name: string;
      logo_url: string | null;
      brand_colors: { accent?: string } | null;
      status: string;
    }[];
    const data = rows[0];
    if (!data || data.status !== "active") return null;
    return {
      name: data.name,
      logoUrl: data.logo_url ?? null,
      accent: data.brand_colors?.accent || OG_GOLD,
    };
  } catch {
    return null;
  }
}

/** Fetch a logo as raw bytes for embedding in an ImageResponse `<img>`. */
export async function ogFetchImage(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { next: { revalidate: OG_REVALIDATE } });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
