"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export interface ReviewItem {
  id: string;
  rating: number;
  created_at: string;
  customer_name: string | null;
  staff_name: string | null;
  comment: string | null;
  business_reply: string | null;
}

/**
 * Customer reviews with a "show more" reveal: renders `initial` cards, then a
 * button that adds `step` more each click until every review is shown.
 */
export function ReviewsGrid({
  reviews,
  locale,
  initial = 6,
  step = 6,
  labels,
}: {
  reviews: ReviewItem[];
  locale: string;
  initial?: number;
  step?: number;
  labels: { anonymous: string; businessReply: string; showMore: string };
}) {
  const [visible, setVisible] = useState(initial);
  const shown = reviews.slice(0, visible);
  const remaining = reviews.length - visible;

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {shown.map((rv, i) => (
          <div
            key={rv.id}
            style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            className="animate-rise rounded-2xl border border-border bg-surface p-5 elev-card transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-card-hover)]"
          >
            <div className="flex items-center justify-between gap-2">
              <Stars rating={rv.rating} />
              <span className="text-xs text-muted">{fmtDate(rv.created_at)}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {rv.customer_name ?? labels.anonymous}
              {rv.staff_name && (
                <span className="font-normal text-muted">
                  {" · "}
                  {rv.staff_name}
                </span>
              )}
            </p>
            {rv.comment && (
              <p className="mt-1 text-sm text-foreground/90">{rv.comment}</p>
            )}
            {rv.business_reply && (
              <div className="mt-3 rounded-lg border-l-2 border-gold bg-surface-2/50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
                  {labels.businessReply}
                </p>
                <p className="mt-0.5 text-sm text-foreground/90">
                  {rv.business_reply}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + step)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold-soft active:scale-[0.98]"
          >
            {labels.showMore.replace("{n}", String(remaining))}
          </button>
        </div>
      )}
    </>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block size-4 shrink-0">
            <Star className="absolute inset-0 size-4 text-muted/40" />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="size-4 fill-gold text-gold" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
