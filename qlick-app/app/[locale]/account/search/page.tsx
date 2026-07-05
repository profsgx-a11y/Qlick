import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Navigation, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteButton } from "@/components/account/favorite-button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  BusinessSearch,
  type CategoryOption,
} from "@/components/account/business-search";

const RADIUS_KM = 30;

/** Great-circle distance in km between two lat/lng points. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    cat?: string;
    lat?: string;
    lng?: string;
    q?: string;
  }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const sp = await searchParams;
  const t = (await getDictionary(locale)).search;

  const supabase = await createClient();

  const { data: catRows } = await supabase
    .from("categories")
    .select("id, name_el, name_en, parent_id, order_index")
    .order("order_index");

  // Build the dropdown list (parents first, each followed by its children).
  const cats = catRows ?? [];
  const catName = (c: { name_el: string; name_en: string | null }) =>
    locale === "en" ? c.name_en || c.name_el : c.name_el;
  const parents = cats.filter((c) => !c.parent_id);
  const categoryOptions: CategoryOption[] = [];
  for (const p of parents) {
    categoryOptions.push({ id: p.id, label: catName(p), isParent: true });
    for (const child of cats.filter((c) => c.parent_id === p.id)) {
      categoryOptions.push({ id: child.id, label: catName(child), isParent: false });
    }
  }

  // Default the search location to the customer's saved home address (if any)
  // when the URL has no explicit location → distances show from their address.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const home = (profile?.address ?? {}) as {
    city?: string;
    street?: string;
    lat?: number | null;
    lng?: number | null;
  };

  const urlLat = sp.lat ? Number(sp.lat) : null;
  const urlLng = sp.lng ? Number(sp.lng) : null;
  const hasUrlLoc =
    urlLat != null &&
    urlLng != null &&
    Number.isFinite(urlLat) &&
    Number.isFinite(urlLng);

  const lat = hasUrlLoc ? urlLat : home.lat ?? null;
  const lng = hasUrlLoc ? urlLng : home.lng ?? null;
  const hasLocation =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const defaultQ = hasUrlLoc
    ? sp.q ?? ""
    : [home.street, home.city].filter(Boolean).join(", ");
  const cat = sp.cat ?? "";

  type Result = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    distanceKm: number;
    city: string;
    street: string;
    logoUrl: string | null;
    favorited: boolean;
  };
  let results: Result[] = [];

  if (hasLocation) {
    const { data: favRows } = user
      ? await supabase
          .from("favorites")
          .select("business_id")
          .eq("customer_id", user.id)
      : { data: [] };
    const favSet = new Set((favRows ?? []).map((f) => f.business_id));

    // Selecting a parent category matches it and all its children. A business
    // can have many categories (business_categories), so match via that table.
    let businessIds: string[] | null = null;
    if (cat) {
      const categoryIds = [
        cat,
        ...cats.filter((c) => c.parent_id === cat).map((c) => c.id),
      ];
      const { data: bcRows } = await supabase
        .from("business_categories")
        .select("business_id")
        .in("category_id", categoryIds);
      businessIds = Array.from(
        new Set((bcRows ?? []).map((r) => r.business_id)),
      );
    }

    let query = supabase
      .from("businesses")
      .select("id, name, slug, address, description, logo_url")
      .eq("status", "active");
    if (businessIds) query = query.in("id", businessIds);

    const { data: biz } = businessIds && businessIds.length === 0
      ? { data: [] }
      : await query;
    results = (biz ?? [])
      .map((b) => {
        const a = (b.address ?? {}) as {
          lat?: number;
          lng?: number;
          city?: string;
          street?: string;
        };
        const distanceKm =
          a.lat != null && a.lng != null
            ? haversineKm(lat!, lng!, a.lat, a.lng)
            : Infinity;
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          distanceKm,
          city: a.city ?? "",
          street: a.street ?? "",
          logoUrl: b.logo_url,
          favorited: favSet.has(b.id),
        };
      })
      .filter((b) => b.distanceKm <= RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return (
    <div className="space-y-6">
      <BusinessSearch
        locale={locale}
        categories={categoryOptions}
        initial={{
          cat,
          q: defaultQ,
          lat: lat != null ? String(lat) : "",
          lng: lng != null ? String(lng) : "",
        }}
      />

      {!hasLocation ? (
        <EmptyState icon={<MapPin />} message={t.emptyPrompt} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          message={`${t.noResults}${cat ? t.noResultsForType : ""}${t.noResultsTail}`}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {results.length}{" "}
            {results.length === 1 ? t.business : t.businesses} {t.nearby}
            {sp.q ? ` «${sp.q}»` : ""}
          </p>
          {results.map((r, i) => (
            <Card
              key={r.id}
              style={{ animationDelay: `${i * 50}ms` }}
              className="group py-4"
            >
              {/* Top: logo + name + favorite */}
              <div className="flex items-center gap-3">
                {r.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.logoUrl}
                    alt={r.name}
                    className="h-16 w-auto max-w-40 shrink-0 rounded-lg border border-border bg-surface-2 object-contain transition-[box-shadow] duration-300 ease-[var(--ease-out)] group-hover:[box-shadow:var(--glow-nav)]"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/b/${r.slug}`}
                    className="font-semibold text-foreground hover:text-gold"
                  >
                    {r.name}
                  </Link>
                  {r.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                      {r.description}
                    </p>
                  )}
                </div>
                <FavoriteButton
                  locale={locale}
                  businessId={r.id}
                  initialFavorited={r.favorited}
                  isAuthed
                  variant="icon"
                />
              </div>

              {/* Bottom: address + distance + book */}
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    {(r.street || r.city) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5 text-gold" />
                        {[r.street, r.city].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Navigation className="size-3.5 text-gold" />
                      {r.distanceKm < 1
                        ? `${Math.round(r.distanceKm * 1000)} ${t.meters}`
                        : `${r.distanceKm.toFixed(1)} ${t.km}`}
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/b/${r.slug}/book`}
                    className="inline-flex h-9 whitespace-nowrap items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
                  >
                    {t.book}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
