import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Free business-data autofill via OpenStreetMap Nominatim (extratags give
// phone / opening_hours / website when the POI is mapped). Server-side so we
// can set a proper User-Agent (required by Nominatim's usage policy).
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export interface PlaceResult {
  name: string;
  label: string;
  street: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  openingHours: string; // raw OSM opening_hours string ("" if none)
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { bucket: "place-search" });
  if (!rl.ok) {
    return NextResponse.json<{ results: PlaceResult[] }>(
      { results: [] },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json<{ results: PlaceResult[] }>({ results: [] });
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("countrycodes", "gr,cy");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "el");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Qlick/1.0 (booking platform; hello@qlick.gr)",
        Referer: "https://qlick.gr",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });

    type Item = {
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
      namedetails?: Record<string, string>;
      extratags?: Record<string, string>;
    };
    const data = (await res.json()) as Item[];

    const results: PlaceResult[] = data
      .map((item) => {
        const a = item.address ?? {};
        const ex = item.extratags ?? {};
        const nd = item.namedetails ?? {};
        const name =
          nd.name || item.name || item.display_name.split(",")[0] || "";
        const street = [a.road, a.house_number].filter(Boolean).join(" ");
        const city =
          a.city || a.town || a.village || a.municipality || a.county || "";
        return {
          name,
          label: item.display_name,
          street,
          city,
          postcode: a.postcode ?? "",
          lat: Number(item.lat),
          lng: Number(item.lon),
          phone: ex.phone || ex["contact:phone"] || ex["contact:mobile"] || "",
          website: ex.website || ex["contact:website"] || "",
          openingHours: ex.opening_hours || "",
        };
      })
      // Keep only named places (drop bare address rows).
      .filter((r) => r.name);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
