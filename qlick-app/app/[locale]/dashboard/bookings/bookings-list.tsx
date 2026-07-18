"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Clock,
  UserX,
  Phone,
  StickyNote,
  RotateCcw,
  Trash2,
  Search,
  CalendarDays,
  Upload,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { formatDateTime, formatTimeRange, formatPrice } from "@/lib/format";
import {
  updateBookingStatus,
  clearBookings,
  type BookingStatus,
} from "./actions";
import { syncGoogleNow } from "../settings/google-actions";

export interface BookingRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  price_cents: number;
}

interface Props {
  locale: string;
  timeZone: string;
  initial: BookingRow[];
  hasGcal: boolean;
}

type Tab = "upcoming" | "past" | "cancelled" | "all";

export function BookingsList({ locale, timeZone, initial, hasGcal }: Props) {
  const dashDict = useDict().dashboard;
  const d = dashDict.bookings;
  const imp = dashDict.import;
  const gcal = dashDict.gcal;
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [gcalMsg, setGcalMsg] = useState<string | null>(null);

  const runGcalSync = () =>
    startSync(async () => {
      const res = await syncGoogleNow(locale);
      if (!res.ok) {
        setGcalMsg(gcal.syncNowFailed);
        setTimeout(() => setGcalMsg(null), 6000);
        return;
      }
      // Google events not yet in Qlick → send the owner to review/import them.
      if ((res.unregistered ?? 0) > 0) {
        router.push(`/${locale}/dashboard/bookings/google-import?prompt=1`);
        return;
      }
      setGcalMsg(gcal.syncNowDone.replace("{pushed}", String(res.pushed ?? 0)));
      setTimeout(() => setGcalMsg(null), 6000);
    });
  const STATUS_META: Record<string, { label: string; cls: string }> = {
    pending: {
      label: d.statusPending,
      cls: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
    },
    confirmed: {
      label: d.statusConfirmed,
      cls: "bg-success/15 text-success ring-1 ring-inset ring-success/25",
    },
    completed: {
      label: d.statusCompleted,
      cls: "bg-surface-3 text-muted ring-1 ring-inset ring-border-strong",
    },
    cancelled: {
      label: d.statusCancelled,
      cls: "bg-danger/15 text-danger ring-1 ring-inset ring-danger/25",
    },
    no_show: {
      label: d.statusNoShow,
      cls: "bg-danger/15 text-danger ring-1 ring-inset ring-danger/25",
    },
  };
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<
    { kind: "cancel"; id: string } | { kind: "clear"; scope: "past" | "cancelled" } | null
  >(null);

  // Captured once per mount (the list re-fetches on navigation/refresh anyway).
  // Reading Date.now() directly during render is impure; this keeps it stable.
  const [now] = useState(() => Date.now());
  const TERMINAL = new Set(["cancelled", "completed", "no_show"]);
  const isUpcoming = (b: BookingRow) =>
    new Date(b.starts_at).getTime() >= now && !TERMINAL.has(b.status);

  const matchesTab = (b: BookingRow, key: Tab) => {
    if (key === "upcoming") return isUpcoming(b);
    if (key === "cancelled") return b.status === "cancelled";
    if (key === "past") return !isUpcoming(b) && b.status !== "cancelled";
    return true; // all
  };

  const countFor = (key: Tab) =>
    rows.filter((b) => matchesTab(b, key)).length;

  // Accent-insensitive name match + digits-only phone match (ignores spaces/+/-)
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const digitsOnly = (s: string) => s.replace(/\D/g, "");
  const q = query.trim();
  const qNorm = norm(q);
  const qDigits = digitsOnly(q);
  const matchesQuery = (b: BookingRow) => {
    if (!q) return true;
    const nameHit = b.customer_name
      ? norm(b.customer_name).includes(qNorm)
      : false;
    const phoneHit =
      qDigits.length > 0 && b.customer_phone
        ? digitsOnly(b.customer_phone).includes(qDigits)
        : false;
    return nameHit || phoneHit;
  };

  const filtered = rows
    .filter((b) => matchesTab(b, tab) && matchesQuery(b))
    .sort((a, b) => {
      const ta = new Date(a.starts_at).getTime();
      const tb = new Date(b.starts_at).getTime();
      // Upcoming: soonest first. Past/cancelled/all: most recent first.
      return tab === "upcoming" ? ta - tb : tb - ta;
    });

  const setStatus = (id: string, status: BookingStatus) => {
    setRows((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
    startTransition(() => {
      void updateBookingStatus(locale, id, status);
    });
  };

  const clearScope = (scope: "past" | "cancelled") => {
    // Optimistically drop matching rows
    setRows((prev) => prev.filter((b) => !matchesTab(b, scope)));
    startTransition(() => {
      void clearBookings(locale, scope);
    });
  };

  const confirmMessage = () => {
    if (!confirming) return "";
    if (confirming.kind === "cancel") return d.cancelConfirm;
    const n = countFor(confirming.scope);
    return (
      confirming.scope === "past" ? d.clearConfirmPast : d.clearConfirmCancelled
    ).replace("{n}", String(n));
  };

  const confirmAction = () => {
    if (!confirming) return;
    if (confirming.kind === "cancel") setStatus(confirming.id, "cancelled");
    else clearScope(confirming.scope);
    setConfirming(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: d.tabUpcoming },
    { key: "past", label: d.tabPast },
    { key: "cancelled", label: d.tabCancelled },
    { key: "all", label: d.tabAll },
  ];

  return (
    <div className="space-y-5">
      {gcalMsg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gold/30 bg-surface px-4 py-2.5 text-sm text-gold shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
          {gcalMsg}
        </div>
      )}
      {/* Tabs (left) + import/export (right); tabs scroll on narrow screens */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="overflow-x-auto pb-1">
      <div className="inline-flex rounded-full border border-border bg-surface p-0.5 text-sm">
        {tabs.map((t) => {
          const count = countFor(t.key);
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97]",
                active
                  ? "bg-gold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "grid min-w-[18px] place-items-center rounded-full px-1.5 text-[10px] font-bold",
                  active ? "bg-black/15 text-black" : "bg-surface-3 text-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      {/* Bring appointments in from Excel / take them with you */}
      <div className="flex shrink-0 items-center gap-2">
        {hasGcal && (
          <button
            onClick={runGcalSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold/50 hover:bg-gold/10 hover:text-gold active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            {syncing ? gcal.syncNowWorking : gcal.syncNowCta}
          </button>
        )}
        <Link
          href={`/${locale}/dashboard/bookings/import`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold/50 hover:bg-gold/10 hover:text-gold active:scale-95"
        >
          <Upload className="size-3.5" />
          {imp.importBtn}
        </Link>
        {rows.length > 0 && (
          <a
            href={`/${locale}/dashboard/bookings/export`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold/50 hover:bg-gold/10 hover:text-gold active:scale-95"
          >
            <Download className="size-3.5" />
            {imp.exportBtn}
          </a>
        )}
      </div>
      </div>

      {/* Search (left) + clear-history actions (right) on the same row */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search by customer name or mobile */}
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              placeholder={d.searchPlaceholder}
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] focus:border-gold/50 focus:outline-none focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--gold)_15%,transparent)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={d.searchClear}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Clear-history actions (past & cancelled tabs) */}
          {(tab === "past" || tab === "cancelled") && countFor(tab) > 0 && (
            <button
              onClick={() => setConfirming({ kind: "clear", scope: tab })}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-danger/40 hover:bg-danger/10 hover:text-danger active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              {tab === "past"
                ? `${d.clearPast} (${countFor("past")})`
                : `${d.clearCancelled} (${countFor("cancelled")})`}
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={q ? <Search /> : <CalendarDays />}
          message={q ? d.searchNoResults.replace("{q}", q) : d.empty}
          action={
            !q && rows.length === 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/dashboard/bookings/import`}>
                  <Upload />
                  {imp.emptyImportCta}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b, i) => {
            const meta = STATUS_META[b.status] ?? STATUS_META.pending;
            const canAct = isUpcoming(b);
            return (
              <Card
                key={b.id}
                style={{ animationDelay: `${i * 45}ms` }}
                className="group py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {b.customer_name || b.customer_phone || d.customerFallback}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          meta.cls,
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {b.service_name || d.serviceFallback}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5 text-gold" />
                        {formatDateTime(b.starts_at, timeZone, locale)} ·{" "}
                        {formatTimeRange(b.starts_at, b.ends_at, timeZone, locale)}
                      </span>
                      {b.customer_name && b.customer_phone && (
                        <a
                          href={`tel:${b.customer_phone}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Phone className="size-3.5" />
                          {b.customer_phone}
                        </a>
                      )}
                      <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
                        {formatPrice(b.price_cents, locale)}
                      </span>
                    </div>
                    {b.customer_notes && (
                      <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
                        <StickyNote className="mt-0.5 size-3 shrink-0" />
                        {b.customer_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {canAct && (
                      <div className="flex shrink-0 gap-1.5">
                        {b.status !== "confirmed" && (
                          <ActionBtn
                            onClick={() => setStatus(b.id, "confirmed")}
                            disabled={isPending}
                            title={d.confirm}
                            className="hover:bg-success/10 hover:text-success"
                          >
                            <Check className="size-4" />
                          </ActionBtn>
                        )}
                        <ActionBtn
                          onClick={() => setStatus(b.id, "completed")}
                          disabled={isPending}
                          title={d.complete}
                          className="hover:bg-gold/10 hover:text-gold"
                        >
                          <Clock className="size-4" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => setStatus(b.id, "no_show")}
                          disabled={isPending}
                          title={d.noShow}
                          className="hover:bg-danger/10 hover:text-danger"
                        >
                          <UserX className="size-4" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() =>
                            setConfirming({ kind: "cancel", id: b.id })
                          }
                          disabled={isPending}
                          title={d.cancel}
                          className="hover:bg-danger/10 hover:text-danger"
                        >
                          <X className="size-4" />
                        </ActionBtn>
                      </div>
                    )}

                  {/* Restore a cancelled (but still upcoming) booking */}
                  {b.status === "cancelled" &&
                    new Date(b.starts_at).getTime() >= now && (
                      <button
                        onClick={() => setStatus(b.id, "confirmed")}
                        disabled={isPending}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-success/40 hover:bg-success/10 hover:text-success active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="size-3.5" />
                        {d.restore}
                      </button>
                    )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.kind === "cancel" ? d.cancel : d.clearTitle}
          message={confirmMessage()}
          danger
          pending={isPending}
          onConfirm={confirmAction}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] active:scale-95 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
