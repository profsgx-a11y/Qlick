import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { highlightParts, scanText } from "@/lib/moderation";
import { ReviewActions } from "./review-actions";

interface Details {
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    description: string | null;
    description_en: string | null;
    email: string | null;
    phone: string | null;
    landline: string | null;
    website: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    address: { street?: string; city?: string; postcode?: string } | null;
    logo_url: string | null;
    cover_url: string | null;
    gallery: unknown;
    created_at: string;
    published_at: string | null;
    bookings_paused: boolean;
    category_el: string | null;
    category_en: string | null;
  };
  owner: {
    user_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    suspended_at: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    name_en: string | null;
    description: string | null;
    duration_minutes: number;
    price_cents: number | null;
    is_active: boolean;
    bookable_online: boolean;
  }[];
  staff: { id: string; name: string; title: string | null; is_active: boolean }[];
  bookings_count: number;
}

// Server-side render of a text with the flagged words highlighted.
function Flagged({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-muted-2">—</span>;
  return (
    <>
      {highlightParts(text).map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            className="rounded bg-warning/30 px-0.5 font-semibold text-foreground"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export default async function AdminBusinessReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);
  const t = dict.admin.review;
  const tb = dict.admin.businesses;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_business_details", {
    p_business: id,
  });
  if (error || !data) notFound();
  const d = data as unknown as Details;
  const b = d.business;

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB")
      : "—";
  const fmtPrice = (cents: number | null) =>
    cents === null ? "—" : `${(cents / 100).toFixed(2).replace(/\.00$/, "")} €`;

  // Everything the owner typed, scanned for suspicious words.
  const allWords = scanText(
    [
      b.name,
      b.description,
      b.description_en,
      ...d.services.flatMap((s) => [s.name, s.name_en, s.description]),
      ...d.staff.flatMap((s) => [s.name, s.title]),
    ]
      .filter(Boolean)
      .join(" "),
  );

  const gallery = Array.isArray(b.gallery)
    ? (b.gallery as unknown[])
        .map((g) =>
          typeof g === "string"
            ? g
            : g && typeof g === "object" && "url" in g
              ? String((g as { url: unknown }).url)
              : null,
        )
        .filter((u): u is string => !!u)
    : [];

  const statusCls: Record<string, string> = {
    active: "bg-success/15 text-success",
    draft: "bg-warning/15 text-warning",
    suspended: "bg-danger/15 text-danger",
  };
  const statusLabel: Record<string, string> = {
    active: tb.statusActive,
    draft: tb.statusDraft,
    suspended: tb.statusSuspended,
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-2">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere]">
        {value ?? <span className="text-muted-2">—</span>}
      </dd>
    </div>
  );

  return (
    <>
      <Topbar
        locale={locale}
        title={t.title}
        subtitle={b.name}
        userLabel={name || email || ""}
      />
      <div className="space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/${locale}/admin/businesses`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t.back}
          </Link>
          <ReviewActions
            locale={locale}
            businessId={b.id}
            businessName={b.name}
            status={b.status}
            owner={
              d.owner?.email
                ? {
                    email: d.owner.email,
                    name: d.owner.name,
                    lang: d.owner.preferred_language === "en" ? "en" : "el",
                  }
                : null
            }
          />
        </div>

        {allWords.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t.flaggedTitle}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t.flaggedWords}: <span className="font-medium text-warning">{allWords.join(", ")}</span>
              </p>
            </div>
          </div>
        )}

        {/* Business details */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {b.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logo_url}
                alt={b.name}
                className="h-14 w-auto max-w-36 rounded-lg border border-border bg-surface-2 object-contain"
              />
            )}
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Flagged text={b.name} />
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls[b.status] ?? "bg-surface-3 text-muted"}`}
                >
                  {statusLabel[b.status] ?? b.status}
                </span>
              </h2>
              <a
                href={`/${locale}/b/${b.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-2 hover:text-gold"
              >
                /{b.slug}
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
          <dl className="space-y-2.5">
            {row(t.category, b.category_el && (locale === "el" ? b.category_el : b.category_en || b.category_el))}
            {row(t.description, b.description && <Flagged text={b.description} />)}
            {row(t.descriptionEn, b.description_en && <Flagged text={b.description_en} />)}
            {row(
              t.address,
              b.address &&
                [b.address.street, b.address.city, b.address.postcode]
                  .filter(Boolean)
                  .join(", "),
            )}
            {row(t.email, b.email)}
            {row(t.phone, [b.phone, b.landline].filter(Boolean).join(" · ") || null)}
            {row(
              t.links,
              [b.website, b.facebook_url, b.instagram_url].some(Boolean) ? (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {[b.website, b.facebook_url, b.instagram_url]
                    .filter((u): u is string => !!u)
                    .map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline"
                      >
                        {u.replace(/^https?:\/\//, "")}
                      </a>
                    ))}
                </span>
              ) : null,
            )}
            {row(t.created, fmtDate(b.created_at))}
            {row(t.published, fmtDate(b.published_at))}
            {row(t.totalBookings, String(d.bookings_count))}
          </dl>
          {(b.cover_url || gallery.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[b.cover_url, ...gallery]
                .filter((u): u is string => !!u)
                .map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={u}
                    src={u}
                    alt=""
                    className="h-24 w-auto rounded-lg border border-border object-cover"
                  />
                ))}
            </div>
          )}
        </section>

        {/* Owner */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">
            {t.ownerTitle}
          </h2>
          {d.owner ? (
            <dl className="space-y-2.5">
              {row(t.ownerName, d.owner.name)}
              {row(t.email, d.owner.email)}
              {row(t.phone, d.owner.phone)}
              {row(t.ownerJoined, fmtDate(d.owner.created_at))}
              {row(t.ownerLastSeen, d.owner.last_sign_in_at ? fmtDate(d.owner.last_sign_in_at) : "—")}
            </dl>
          ) : (
            <p className="text-sm text-muted">{tb.noOwner}</p>
          )}
        </section>

        {/* Services */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">
            {t.servicesTitle} ({d.services.length})
          </h2>
          {d.services.length === 0 ? (
            <p className="text-sm text-muted">{t.noServices}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-2">
                    <th className="py-2 pr-4 font-medium">{t.colService}</th>
                    <th className="py-2 pr-4 font-medium">{t.colDescription}</th>
                    <th className="py-2 pr-4 font-medium">{t.colDuration}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.colPrice}</th>
                    <th className="py-2 font-medium">{t.colActive}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.services.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        <Flagged text={s.name} />
                        {s.name_en && (
                          <p className="text-xs font-normal text-muted-2">
                            <Flagged text={s.name_en} />
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted">
                        <Flagged text={s.description} />
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted">
                        {s.duration_minutes}′
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-right text-muted">
                        {fmtPrice(s.price_cents)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            s.is_active
                              ? "bg-success/15 text-success"
                              : "bg-surface-3 text-muted"
                          }`}
                        >
                          {s.is_active ? t.serviceActive : t.serviceInactive}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Staff */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">
            {t.staffTitle} ({d.staff.length})
          </h2>
          {d.staff.length === 0 ? (
            <p className="text-sm text-muted">{t.noStaff}</p>
          ) : (
            <ul className="space-y-2">
              {d.staff.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    <Flagged text={s.name} />
                  </span>
                  {s.title && (
                    <span className="text-muted">
                      — <Flagged text={s.title} />
                    </span>
                  )}
                  {!s.is_active && (
                    <span className="inline-flex rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {t.serviceInactive}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
