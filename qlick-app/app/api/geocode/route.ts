import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy to OpenStreetMap Nominatim. Server-side so we can set a proper
// User-Agent (required by their usage policy) and bias results to Greece.
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export interface GeocodeResult {
  label: string;
  street: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const kind = sp.get("kind") === "city" ? "city" : "address";
  const city = sp.get("city")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json<{ results: GeocodeResult[] }>({ results: [] });
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "gr,cy");
  url.searchParams.set("limit", kind === "city" ? "8" : "6");
  url.searchParams.set("accept-language", "el");
  if (kind === "city") {
    // City picker: restrict to settlements (cities/towns/villages).
    url.searchParams.set("q", q);
    url.searchParams.set("featuretype", "settlement");
  } else if (city) {
    // Address scoped to a chosen city → structured query (no free-form q).
    url.searchParams.set("street", q);
    url.searchParams.set("city", city);
  } else {
    url.searchParams.set("q", q);
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Qlick/1.0 (booking platform; hello@qlick.gr)",
        Referer: "https://qlick.gr",
      },
      // Cache identical lookups for a day to be kind to Nominatim
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    type NominatimItem = {
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
    };

    const data = (await res.json()) as NominatimItem[];

    const results: GeocodeResult[] = data.map((item) => {
      const a = item.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(" ");
      const city =
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.county ||
        item.name ||
        item.display_name.split(",")[0] ||
        "";
      return {
        label: item.display_name,
        street,
        city,
        postcode: a.postcode ?? "",
        lat: Number(item.lat),
        lng: Number(item.lon),
      };
    });

    // Dedupe city results by name (same town can appear multiple times).
    const deduped =
      kind === "city"
        ? results.filter(
            (r, i) =>
              results.findIndex(
                (o) => o.city.toLowerCase() === r.city.toLowerCase(),
              ) === i,
          )
        : results;

    return NextResponse.json({ results: deduped });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
