import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { bucket: "reverse-geocode" });
  if (!rl.ok) {
    return NextResponse.json(
      { label: "" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat")?.trim());
  const lng = Number(sp.get("lng")?.trim());
  // Only ever accept real coordinates, and build the query with URLSearchParams
  // rather than string interpolation — otherwise a crafted `lat` smuggles extra
  // parameters into the Nominatim request we make on the caller's behalf.
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ label: "" });
  }
  const lang = sp.get("lang") === "en" ? "en" : "el";

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", lang);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Qlick/1.0 (booking platform; hello@qlick.gr)",
        Referer: "https://qlick.gr",
      },
      // Same-spot lookups repeat a lot while dragging the map pin; be kind to
      // Nominatim (and don't let a burst get our server IP blocked).
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ label: "" });

    const data = await res.json() as { address?: Record<string, string> };
    const a = data.address ?? {};
    const city =
      a.city || a.town || a.village || a.municipality || "";
    const suburb =
      a.suburb || a.neighbourhood || a.quarter || a.road || "";
    const street = [a.road, a.house_number].filter(Boolean).join(" ");
    const postcode = a.postcode || "";
    // Prefer the town/city name (e.g. "Κομοτηνή") over a hyper-local suburb
    // ("Ήφαιστος") — the search uses a wide radius, so city level is clearer.
    const label = city || suburb;

    return NextResponse.json({ label, street, city, postcode });
  } catch {
    return NextResponse.json({ label: "" });
  }
}
