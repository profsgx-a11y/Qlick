"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Star,
  StarHalf,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { scanText, highlightParts } from "@/lib/moderation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setReviewStatus, deleteReview } from "./actions";

interface ReviewRow {
  id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  staff_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  comment: string | null;
  business_reply: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

type Tab = "all" | "flagged" | "hidden";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Render a text with flagged words highlighted. */
function Flagged({ text }: { text: string }) {
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

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="flex text-gold">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={i} className="size-3.5 fill-current" />
        ))}
        {half && <StarHalf className="size-3.5 fill-current" />}
      </span>
      <span className="text-xs font-semibold text-foreground">{rating}</span>
    </span>
  );
}

export function ReviewsTable({
  locale,
  rows,
}: {
  locale: string;
  rows: ReviewRow[];
}) {
  const t = useDict().admin.reviews;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [pending, startTransition] = useTransition();
  const [confirmFor, setConfirmFor] = useState<
    { row: ReviewRow; action: "hide" | "delete" } | null
  >(null);

  // Suspicious words per review (comment + reply + names), computed once.
  const flags = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const r of rows) {
      const words = scanText(
        [r.comment, r.business_reply, r.customer_name].filter(Boolean).join(" "),
      );
      if (words.length > 0) out[r.id] = words;
    }
    return out;
  }, [rows]);

  const counts = {
    all: rows.length,
    flagged: Object.keys(flags).length,
    hidden: rows.filter((r) => r.status === "hidden").length,
  };

  const q = norm(query.trim());
  const filtered = rows.filter((r) => {
    if (tab === "flagged" && !flags[r.id]) return false;
    if (tab === "hidden" && r.status !== "hidden") return false;
    if (!q) return true;
    return [r.customer_name, r.customer_email, r.business_name, r.comment]
      .filter(Boolean)
      .some((v) => norm(String(v)).includes(q));
  });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setConfirmFor(null);
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.refresh();
    });

  const customerLabel = (r: ReviewRow) =>
    r.customer_name || r.customer_email || "—";

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t.fAll, count: counts.all },
    { key: "flagged", label: t.fFlagged, count: counts.flagged },
    { key: "hidden", label: t.fHidden, count: counts.hidden },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {rows.length === 0
            ? t.empty
            : q
              ? t.noResults.replace("{q}", query)
              : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">{t.colRating}</th>
                <th className="px-4 py-3 font-medium">{t.colComment}</th>
                <th className="px-4 py-3 font-medium">{t.colCustomer}</th>
                <th className="px-4 py-3 font-medium">{t.colBusiness}</th>
                <th className="px-4 py-3 font-medium">{t.colDate}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <Stars rating={r.rating} />
                      {flags[r.id] && (
                        <span
                          title={t.flaggedTooltip.replace(
                            "{words}",
                            flags[r.id].join(", "),
                          )}
                        >
                          <AlertTriangle className="size-4 shrink-0 text-warning" />
                        </span>
                      )}
                    </div>
                    {r.staff_name && (
                      <p className="mt-0.5 text-[11px] text-muted-2">
                        {t.forStaff.replace("{name}", r.staff_name)}
                      </p>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 align-top">
                    {r.comment ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground [overflow-wrap:anywhere]">
                        <Flagged text={r.comment} />
                      </p>
                    ) : (
                      <span className="text-muted-2">{t.noComment}</span>
                    )}
                    {r.business_reply && (
                      <p className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted [overflow-wrap:anywhere]">
                        <span className="font-semibold">{t.replyLabel}:</span>{" "}
                        <Flagged text={r.business_reply} />
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-foreground">{r.customer_name || "—"}</p>
                    {r.customer_email && (
                      <p className="text-xs text-muted-2">{r.customer_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${locale}/admin/businesses/${r.business_id}`}
                        className="font-medium text-foreground hover:text-gold"
                      >
                        {r.business_name}
                      </Link>
                      <a
                        href={`/${locale}/b/${r.business_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-2 hover:text-gold"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-muted">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.status === "published"
                          ? "bg-success/15 text-success"
                          : "bg-surface-3 text-muted"
                      }`}
                    >
                      {r.status === "published" ? t.statusPublished : t.statusHidden}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "published" ? (
                        <button
                          type="button"
                          onClick={() => setConfirmFor({ row: r, action: "hide" })}
                          disabled={pending}
                          title={t.actionHide}
                          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                        >
                          <EyeOff className="size-4 text-warning" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            run(() => setReviewStatus(locale, r.id, "published"))
                          }
                          disabled={pending}
                          title={t.actionShow}
                          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                        >
                          <Eye className="size-4 text-success" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmFor({ row: r, action: "delete" })}
                        disabled={pending}
                        title={t.actionDelete}
                        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmFor && (
        <ConfirmDialog
          title={
            confirmFor.action === "delete" ? t.actionDelete : t.actionHide
          }
          message={(confirmFor.action === "delete"
            ? t.confirmDelete
            : t.confirmHide
          ).replace("{name}", customerLabel(confirmFor.row))}
          danger={confirmFor.action === "delete"}
          pending={pending}
          onConfirm={() =>
            confirmFor.action === "delete"
              ? run(() => deleteReview(locale, confirmFor.row.id))
              : run(() => setReviewStatus(locale, confirmFor.row.id, "hidden"))
          }
          onCancel={() => setConfirmFor(null)}
        />
      )}
    </div>
  );
}
