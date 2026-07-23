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
  const lat = sp.get("lat")?.trim();
  const lng = sp.get("lng")?.trim();
  const lang = sp.get("lang") ?? "el";

  if (!lat || !lng) return NextResponse.json({ label: "" });

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${lang}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Qlick/1.0 (booking platform; hello@qlick.gr)",
        Referer: "https://qlick.gr",
      },
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
