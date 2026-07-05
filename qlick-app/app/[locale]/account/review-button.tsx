"use client";

import { useState, useTransition } from "react";
import { Star, X, CheckCircle2, Pencil } from "lucide-react";
import { StarRatingInput } from "@/components/account/star-rating-input";
import { StarRatingDisplay } from "@/components/account/star-rating-display";
import {
  NameVisibilityPicker,
  inferNameVisibility,
  type NameVisibility,
} from "@/components/account/name-visibility-picker";
import { useDict } from "@/i18n/provider";
import { reviewError } from "@/lib/review-error";
import { formatDateTime } from "@/lib/format";
import { createReview, updateReview } from "./actions";

export interface ExistingReview {
  id: string;
  rating: number;
  comment: string | null;
  customerName?: string | null;
}

interface Props {
  locale: string;
  bookingId: string;
  existingReview: ExistingReview | null;
  staffName: string | null;
  /** Whether the 48h review window is still open (no existing review). */
  canReview: boolean;
  /** ISO of the review deadline (completed_at + 48h), for the hint. */
  deadlineIso: string | null;
  timeZone: string;
}

export function ReviewButton({
  locale,
  bookingId,
  existingReview,
  staffName,
  canReview,
  deadlineIso,
  timeZone,
}: Props) {
  const t = useDict().account;
  const [current, setCurrent] = useState<ExistingReview | null>(existingReview);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [nameVis, setNameVis] = useState<NameVisibility>("full");
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setRating(current?.rating ?? 0);
    setComment(current?.comment ?? "");
    setNameVis(
      current ? inferNameVisibility(current.customerName) : "full",
    );
    setErr(null);
    setOpen(true);
  };

  const submit = () => {
    setErr(null);
    if (rating < 1) {
      setErr(t.pickRating);
      return;
    }
    startTransition(async () => {
      const res = current
        ? await updateReview(locale, current.id, rating, comment, nameVis)
        : await createReview(locale, bookingId, rating, comment, nameVis);
      if (!res.ok) {
        setErr(reviewError(t, res.error));
        return;
      }
      setCurrent({
        id: current?.id ?? res.id ?? "",
        rating,
        comment: comment.trim() || null,
      });
      setOpen(false);
    });
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {current ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <CheckCircle2 className="size-4 text-emerald-500" />
            {t.rated} ·
            <StarRatingDisplay rating={current.rating} showValue />
          </span>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            <Pencil className="size-3.5" />
            {t.edit}
          </button>
        </div>
      ) : canReview ? (
        <div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-sm font-medium text-gold hover:bg-gold/10"
          >
            <Star className="size-4" />
            {t.leaveReview}
          </button>
          {deadlineIso && (
            <p className="mt-2 text-xs text-muted">
              {t.reviewUntil.replace(
                "{date}",
                formatDateTime(deadlineIso, timeZone, locale),
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">{t.reviewWindowExpired}</p>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[360px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-display text-base font-bold text-foreground">
                {current ? t.editReviewTitle : t.howWasIt}
                {staffName && (
                  <span className="ml-1 font-normal text-muted">
                    {t.with} {staffName}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label={t.close}
              >
                <X className="size-4" />
              </button>
            </div>

            <StarRatingInput
              value={rating}
              onChange={setRating}
              disabled={isPending}
            />

            <div className="mt-3">
              <NameVisibilityPicker
                value={nameVis}
                onChange={setNameVis}
                disabled={isPending}
              />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.commentPlaceholder}
              disabled={isPending}
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
                disabled={isPending}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
              >
                {isPending ? t.saving : current ? t.save : t.submit}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {t.cancelShort}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
