import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, MapPin, Heart } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { FavoriteButton } from "@/components/account/favorite-button";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).account;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: rows } = await supabase
    .from("favorites")
    .select(
      "business_id, created_at, businesses(name, slug, status, address, description, logo_url)",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  // Keep only active businesses (a favorite may point to a now-inactive shop).
  const favorites = (rows ?? [])
    .map((r) => ({
      businessId: r.business_id,
      biz: r.businesses as {
        name: string;
        slug: string;
        status: string;
        address: unknown;
        description: string | null;
        logo_url: string | null;
      } | null,
    }))
    .filter((f) => f.biz && f.biz.status === "active");

  if (favorites.length === 0) {
    return <EmptyState icon={<Heart />} message={t.noFavorites} />;
  }

  return (
    <div className="space-y-3">
      {favorites.map((f, i) => {
        const addr = (f.biz!.address ?? {}) as { street?: string; city?: string };
        const addressLine = [addr.street, addr.city].filter(Boolean).join(", ");
        return (
          <Card
            key={f.businessId}
            style={{ animationDelay: `${i * 50}ms` }}
            className="group py-4"
          >
            {/* Top: logo + name + favorite */}
            <div className="flex items-center gap-3">
              {f.biz!.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.biz!.logo_url}
                  alt={f.biz!.name}
                  className="h-16 w-auto max-w-40 shrink-0 rounded-lg border border-border bg-surface-2 object-contain transition-[box-shadow] duration-300 ease-[var(--ease-out)] group-hover:[box-shadow:var(--glow-nav)]"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/b/${f.biz!.slug}`}
                  className="font-semibold text-foreground hover:text-gold"
                >
                  {f.biz!.name}
                </Link>
                {f.biz!.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                    {f.biz!.description}
                  </p>
                )}
              </div>
              <FavoriteButton
                locale={locale}
                businessId={f.businessId}
                initialFavorited
                isAuthed
                variant="icon"
              />
            </div>

            {/* Bottom: address + book button */}
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {addressLine && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-gold" />
                      {addressLine}
                    </span>
                  )}
                </div>
                <Link
                  href={`/${locale}/b/${f.biz!.slug}/book`}
                  className="inline-flex h-9 whitespace-nowrap items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-medium text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
                >
                  {t.book}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
