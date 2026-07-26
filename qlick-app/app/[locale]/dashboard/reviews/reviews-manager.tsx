"use client";

import { useMemo, useState, useTransition } from "react";
import { Star, Flag, Reply, X, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { reportReview, replyToReview } from "./actions";

export interface ReviewRow {
  id: string;
  staff_id: string | null;
  staff_name: string | null;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  business_reply: string | null;
  status: string;
  created_at: string;
}

interface Props {
  locale: string;
  initialReviews: ReviewRow[];
  staff: { id: string; name: string }[];
  reportedIds: string[];
}

const UNASSIGNED = "__unassigned__";

// Keep in sync with REPORT_TYPES in actions.ts and reportTypes in the i18n dict.
const REVIEW_REPORT_TYPES = [
  "spam",
  "offensive",
  "irrelevant",
  "false_claims",
  "other",
] as const;

function Stars({ rating }: { rating: number }) {
  const size = 16;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star
              className="absolute inset-0 text-muted/40"
              style={{ width: size, height: size }}
            />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="fill-gold text-gold"
                style={{ width: size, height: size, maxWidth: "none" }}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function ReviewsManager({
  locale,
  initialReviews,
  staff,
  reportedIds,
}: Props) {
  const dd = useDict().dashboard;
  const t = dd.reviews;
  const [rows, setRows] = useState<ReviewRow[]>(initialReviews);
  const [filter, setFilter] = useState<string>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportType, setReportType] =
    useState<(typeof REVIEW_REPORT_TYPES)[number]>("spam");
  const [reportNote, setReportNote] = useState("");
  const [reported, setReported] = useState<Set<string>>(
    () => new Set(reportedIds),
  );
  const [isPending, startTransition] = useTransition();

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === UNASSIGNED) return rows.filter((r) => !r.staff_id);
    return rows.filter((r) => r.staff_id === filter);
  }, [rows, filter]);

  const openReply = (r: ReviewRow) => {
    setReportingId(null);
    setReplyingId(r.id);
    setReplyText(r.business_reply ?? "");
  };

  const saveReply = (id: string) => {
    const text = replyText;
    setRows((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, business_reply: text.trim() || null } : x,
      ),
    );
    setReplyingId(null);
    startTransition(() => {
      void replyToReview(locale, id, text);
    });
  };

  const openReport = (r: ReviewRow) => {
    setReplyingId(null);
    setReportingId(r.id);
    setReportType("spam");
    setReportNote("");
  };

  const submitReport = (id: string) => {
    const type = reportType;
    const note = reportNote;
    setReported((prev) => new Set(prev).add(id));
    setReportingId(null);
    startTransition(() => {
      void reportReview(locale, id, type, note);
    });
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      {staff.length > 0 && rows.length > 0 && (
        <SelectMenu
          value={filter}
          onChange={setFilter}
          ariaLabel={t.allStaff}
          className="w-full sm:w-60"
          triggerClassName="h-9"
          options={[
            { value: "all", label: t.allStaff },
            ...staff.map((s) => ({ value: s.id, label: s.name })),
            { value: UNASSIGNED, label: t.unassigned },
          ]}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          message={rows.length === 0 ? t.emptyAll : t.emptyStaff}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => {
            const isReported = reported.has(r.id);
            return (
              <Card
                key={r.id}
                style={{ animationDelay: `${i * 45}ms` }}
                className={cn(
                  "group py-4",
                  r.status === "hidden" && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={Number(r.rating)} />
                      <span className="text-xs font-medium text-gold tabular-nums">
                        {Number(r.rating).toFixed(1)}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {r.customer_name ?? t.anonymous}
                      </span>
                      {r.staff_name && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          {r.staff_name}
                        </span>
                      )}
                      {r.status === "hidden" && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          {t.hidden}
                        </span>
                      )}
                      {isReported && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                          <Flag className="size-3" />
                          {t.reported}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted">
                      {fmtDate(r.created_at)}
                    </span>
                    {r.comment && (
                      <p className="mt-1.5 text-sm text-foreground/90">
                        {r.comment}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openReport(r)}
                      disabled={isPending}
                      title={t.report}
                      className={cn(
                        "grid size-9 place-items-center rounded-lg transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-warning/10 hover:text-warning active:scale-95",
                        isReported ? "text-warning" : "text-muted",
                      )}
                    >
                      <Flag className="size-4" />
                    </button>
                    <button
                      onClick={() => openReply(r)}
                      disabled={isPending}
                      title={r.business_reply ? t.editReply : t.reply}
                      className={cn(
                        "grid size-9 place-items-center rounded-lg transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-gold/10 hover:text-gold active:scale-95",
                        r.business_reply ? "text-gold" : "text-muted",
                      )}
                    >
                      <Reply className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Report editor */}
                {reportingId === r.id && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                      {t.reportTitle}
                    </p>
                    <SelectMenu
                      value={reportType}
                      onChange={(v) =>
                        setReportType(v as (typeof REVIEW_REPORT_TYPES)[number])
                      }
                      ariaLabel={t.reportTypeLabel}
                      className="w-full sm:w-72"
                      triggerClassName="h-9"
                      options={REVIEW_REPORT_TYPES.map((v) => ({
                        value: v,
                        label: t.reportTypes[v],
                      }))}
                    />
                    <textarea
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value.slice(0, 500))}
                      placeholder={t.reportNotePlaceholder}
                      rows={2}
                      disabled={isPending}
                      className="block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitReport(r.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-sm font-semibold text-black transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
                      >
                        <Flag className="size-4" />
                        {t.reportSubmit}
                      </button>
                      <button
                        onClick={() => setReportingId(null)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground active:scale-[0.97]"
                      >
                        <X className="size-4" /> {dd.cancel}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply display / editor */}
                {replyingId === r.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t.replyPlaceholder}
                      rows={2}
                      disabled={isPending}
                      className="block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => saveReply(r.id)}
                        disabled={isPending}
                        className="rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97] disabled:opacity-40"
                      >
                        {dd.save}
                      </button>
                      <button
                        onClick={() => setReplyingId(null)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground active:scale-[0.97]"
                      >
                        <X className="size-4" /> {dd.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  r.business_reply && (
                    <div className="mt-3 rounded-lg border-l-2 border-gold bg-surface-2/50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
                        {t.businessReply}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground/90">
                        {r.business_reply}
                      </p>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
