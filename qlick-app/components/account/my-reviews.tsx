"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X, Pencil, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRatingInput } from "@/components/account/star-rating-input";
import { StarRatingDisplay } from "@/components/account/star-rating-display";
import {
  NameVisibilityPicker,
  inferNameVisibility,
  type NameVisibility,
} from "@/components/account/name-visibility-picker";
import { useDict } from "@/i18n/provider";
import { reviewError } from "@/lib/review-error";
import { updateReview } from "@/app/[locale]/account/actions";

export interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  staffName: string | null;
  businessReply: string | null;
  createdAt: string;
  customerName: string | null;
  businessName: string;
  businessSlug: string;
  businessLogo: string | null;
}

export function MyReviews({
  locale,
  reviews,
}: {
  locale: string;
  reviews: MyReview[];
}) {
  const t = useDict().account;
  const [items, setItems] = useState(reviews);
  const [editing, setEditing] = useState<MyReview | null>(null);

  if (items.length === 0) {
    return <EmptyState icon={<MessageSquare />} message={t.noReviews} />;
  }

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  return (
    <div className="space-y-3">
      {items.map((r, i) => (
        <Card
          key={r.id}
          style={{ animationDelay: `${i * 50}ms` }}
          className="group py-4"
        >
          {/* Top: logo + business name + edit button */}
          <div className="flex items-center gap-3">
            {r.businessLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.businessLogo}
                alt={r.businessName}
                className="h-16 w-auto max-w-40 shrink-0 rounded-lg border border-border bg-surface-2 object-contain transition-[box-shadow] duration-300 ease-[var(--ease-out)] group-hover:[box-shadow:var(--glow-nav)]"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-surface-2" />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/${locale}/b/${r.businessSlug}`}
                className="font-semibold text-foreground hover:text-gold"
              >
                {r.businessName}
              </Link>
              {r.staffName && (
                <p className="mt-0.5 text-sm text-muted">
                  {t.with} {r.staffName}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(r)}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gold hover:underline"
            >
              <Pencil className="size-3.5" />
              {t.edit}
            </button>
          </div>

          {/* Bottom: rating + date + comment + business reply */}
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <StarRatingDisplay rating={r.rating} showValue />
              <span className="text-xs text-muted">{fmtDate(r.createdAt)}</span>
            </div>

            {r.comment && (
              <p className="mt-2 text-sm text-foreground">{r.comment}</p>
            )}

            {r.businessReply && (
              <div className="mt-3 rounded-lg border border-border bg-surface-2/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gold">
                  <MessageSquare className="size-3.5" />
                  {t.businessReply}
                </p>
                <p className="mt-1 text-sm text-muted">{r.businessReply}</p>
              </div>
            )}
          </div>
        </Card>
      ))}

      {editing && (
        <EditModal
          locale={locale}
          review={editing}
          onClose={() => setEditing(null)}
          onSaved={(rating, comment) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === editing.id ? { ...it, rating, comment } : it,
              ),
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  locale,
  review,
  onClose,
  onSaved,
}: {
  locale: string;
  review: MyReview;
  onClose: () => void;
  onSaved: (rating: number, comment: string | null) => void;
}) {
  const t = useDict().account;
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [nameVis, setNameVis] = useState<NameVisibility>(
    inferNameVisibility(review.customerName),
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setErr(null);
    if (rating < 1) {
      setErr(t.pickRating);
      return;
    }
    startTransition(async () => {
      const res = await updateReview(locale, review.id, rating, comment, nameVis);
      if (!res.ok) {
        setErr(reviewError(t, res.error));
        return;
      }
      onSaved(rating, comment.trim() || null);
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => !pending && onClose()}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => !pending && onClose()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-pop w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-5 shadow-2xl"
        >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="font-display text-base font-bold text-foreground">
            {t.editReviewTitle}
            <span className="ml-1 font-normal text-muted">
              · {review.businessName}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label={t.close}
          >
            <X className="size-4" />
          </button>
        </div>

        <StarRatingInput value={rating} onChange={setRating} disabled={pending} />

        <div className="mt-3">
          <NameVisibilityPicker
            value={nameVis}
            onChange={setNameVis}
            disabled={pending}
          />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.commentPlaceholder}
          disabled={pending}
          rows={3}
          className="mt-3 block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
        />

        {err && (
          <p className="mt-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97] disabled:opacity-40"
          >
            {pending ? t.saving : t.save}
          </button>
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground active:scale-[0.97]"
          >
            {t.cancelShort}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
