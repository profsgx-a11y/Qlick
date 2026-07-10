"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  X,
} from "lucide-react";
import { useDict } from "@/i18n/provider";

export const BOOKINGS_PAGE_SIZE = 50;

interface BookingRow {
  id: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  status: string;
  source: string;
  price_cents: number | null;
  service_name: string | null;
  staff_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  business_id: string;
  business_name: string;
  business_slug: string;
  cancelled_by: string | null;
  customer_notes: string | null;
  total_count: number;
}

export interface BookingFilters {
  q: string;
  status: string;
  source: string;
  from: string;
  to: string;
}

export function BookingsExplorer({
  locale,
  rows,
  page,
  filters,
}: {
  locale: string;
  rows: BookingRow[];
  page: number;
  filters: BookingFilters;
}) {
  const t = useDict().admin.bookings;
  const base = `/${locale}/admin/bookings`;
  // Booking whose full customer note is shown in a popup (null = closed).
  const [noteRow, setNoteRow] = useState<BookingRow | null>(null);
  const total = rows[0]?.total_count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (filters.q) qs.set("q", filters.q);
    if (filters.status) qs.set("status", filters.status);
    if (filters.source) qs.set("source", filters.source);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };

  const dtLocale = locale === "el" ? "el-GR" : "en-GB";
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString(dtLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dtLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  const fmtPrice = (cents: number | null) =>
    cents === null ? "—" : `${(cents / 100).toFixed(2).replace(/\.00$/, "")} €`;

  const statusMeta: Record<string, { label: string; cls: string }> = {
    pending: { label: t.statusPending, cls: "bg-warning/15 text-warning" },
    confirmed: { label: t.statusConfirmed, cls: "bg-gold/15 text-gold" },
    completed: { label: t.statusCompleted, cls: "bg-success/15 text-success" },
    cancelled: { label: t.statusCancelled, cls: "bg-danger/15 text-danger" },
    no_show: { label: t.statusNoShow, cls: "bg-surface-3 text-muted" },
  };
  const sourceMeta: Record<string, { label: string; cls: string }> = {
    qr: { label: t.sourceQr, cls: "bg-gold/15 text-gold" },
    web: { label: t.sourceWeb, cls: "bg-surface-3 text-muted" },
    dashboard: { label: t.sourceDashboard, cls: "bg-surface-3 text-muted" },
    phone: { label: t.sourcePhone, cls: "bg-surface-3 text-muted" },
  };
  const cancelledBy: Record<string, string> = {
    customer: t.byCustomer,
    business: t.byBusiness,
    system: t.bySystem,
  };

  const badge = (meta: { label: string; cls: string } | undefined, raw: string) => (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${meta?.cls ?? "bg-surface-3 text-muted"}`}
    >
      {meta?.label ?? raw}
    </span>
  );

  const selectCls =
    "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30";

  const showFrom = total === 0 ? 0 : (page - 1) * BOOKINGS_PAGE_SIZE + 1;
  const showTo = Math.min(total, page * BOOKINGS_PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters — plain GET form so the URL stays shareable */}
      <form method="get" action={base} className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder={t.search}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
            {t.fStatus}
          </span>
          <select name="status" defaultValue={filters.status} className={selectCls}>
            <option value="">{t.fAll}</option>
            <option value="pending">{t.statusPending}</option>
            <option value="confirmed">{t.statusConfirmed}</option>
            <option value="completed">{t.statusCompleted}</option>
            <option value="cancelled">{t.statusCancelled}</option>
            <option value="no_show">{t.statusNoShow}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
            {t.fSource}
          </span>
          <select name="source" defaultValue={filters.source} className={selectCls}>
            <option value="">{t.fAll}</option>
            <option value="qr">{t.sourceQr}</option>
            <option value="web">{t.sourceWeb}</option>
            <option value="dashboard">{t.sourceDashboard}</option>
            <option value="phone">{t.sourcePhone}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
            {t.fFrom}
          </span>
          <input name="from" type="date" defaultValue={filters.from} className={selectCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
            {t.fTo}
          </span>
          <input name="to" type="date" defaultValue={filters.to} className={selectCls} />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition-colors hover:bg-gold/90"
        >
          {t.searchBtn}
        </button>
        <Link
          href={base}
          className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {t.clear}
        </Link>
      </form>

      <p className="text-xs text-muted-2">{t.results.replace("{n}", String(total))}</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">{t.colWhen}</th>
                <th className="px-4 py-3 font-medium">{t.colBusiness}</th>
                <th className="px-4 py-3 font-medium">{t.colCustomer}</th>
                <th className="px-4 py-3 font-medium">{t.colService}</th>
                <th className="px-4 py-3 font-medium">{t.colStaff}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colPrice}</th>
                <th className="px-4 py-3 font-medium">{t.colSource}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 text-center font-medium">{t.colNote}</th>
                <th className="px-4 py-3 font-medium">{t.colBooked}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                    {fmtDateTime(r.starts_at)}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.customer_name || "—"}</p>
                    <p className="text-xs text-muted-2">
                      {[r.customer_phone, r.customer_email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.service_name || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.staff_name || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-muted">
                    {fmtPrice(r.price_cents)}
                  </td>
                  <td className="px-4 py-3">{badge(sourceMeta[r.source], r.source)}</td>
                  <td className="px-4 py-3">
                    {badge(statusMeta[r.status], r.status)}
                    {r.status === "cancelled" && r.cancelled_by && (
                      <p className="mt-0.5 text-[11px] text-muted-2">
                        {cancelledBy[r.cancelled_by] ?? r.cancelled_by}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.customer_notes?.trim() ? (
                      <button
                        type="button"
                        onClick={() => setNoteRow(r)}
                        title={t.viewNote}
                        aria-label={t.viewNote}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-gold transition-colors hover:bg-gold/10"
                      >
                        <StickyNote className="size-4" />
                      </button>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {fmtDate(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > BOOKINGS_PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-2">
            {t.pageInfo
              .replace("{from}", String(showFrom))
              .replace("{to}", String(showTo))
              .replace("{total}", String(total))}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                {t.prev}
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted-2 opacity-50">
                <ChevronLeft className="size-4" />
                {t.prev}
              </span>
            )}
            {page < lastPage ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {t.next}
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted-2 opacity-50">
                {t.next}
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Customer note popup */}
      {noteRow && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setNoteRow(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-foreground">
                  <StickyNote className="size-4 text-gold" />
                  {t.noteTitle}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {[noteRow.customer_name, fmtDateTime(noteRow.starts_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoteRow(null)}
                className="text-muted hover:text-foreground"
                aria-label={t.noteClose}
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-foreground/90">
              {noteRow.customer_notes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
