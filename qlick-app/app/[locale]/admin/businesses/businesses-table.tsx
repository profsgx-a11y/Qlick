"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ExternalLink,
  Ban,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  FileSearch,
} from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setBusinessStatus, deleteBusiness } from "./actions";

interface BizRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  city: string | null;
  category_el: string | null;
  owner_name: string | null;
  owner_email: string | null;
  bookings_count: number;
  created_at: string;
  published_at: string | null;
  trial_state: string;
  trial_days_left: number | null;
  trial_total_days: number;
  owner_last_sign_in_at: string | null;
  plan: string;
  plan_expires_at: string | null;
  trial_bonus_days: number;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BusinessesTable({
  locale,
  rows,
  flags = {},
}: {
  locale: string;
  rows: BizRow[];
  flags?: Record<string, string[]>;
}) {
  const t = useDict().admin.businesses;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<BizRow | null>(null);
  // Captured once per mount; reading Date.now() during render is impure.
  const [now] = useState(() => Date.now());

  const q = norm(query.trim());
  const filtered = !q
    ? rows
    : rows.filter((r) =>
        [r.name, r.owner_name, r.owner_email, r.city]
          .filter(Boolean)
          .some((v) => norm(String(v)).includes(q)),
      );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB");

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      active: { label: t.statusActive, cls: "bg-success/15 text-success" },
      draft: { label: t.statusDraft, cls: "bg-warning/15 text-warning" },
      suspended: { label: t.statusSuspended, cls: "bg-danger/15 text-danger" },
    };
    const m = map[status] ?? { label: status, cls: "bg-surface-3 text-muted" };
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
        {m.label}
      </span>
    );
  };

  const trialBadge = (r: BizRow) => {
    if (r.trial_state === "paid") {
      return (
        <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
          {t.trialPaid}
        </span>
      );
    }
    if (r.trial_state === "trialing") {
      return (
        <span
          className="inline-flex rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold"
          title={
            r.trial_bonus_days > 0
              ? t.bonusDays.replace("{n}", String(r.trial_bonus_days))
              : undefined
          }
        >
          {t.trialLeft.replace("{n}", String(r.trial_days_left ?? 0))}
          {r.trial_bonus_days > 0 && " ✦"}
        </span>
      );
    }
    if (r.trial_state === "expired") {
      return (
        <span className="inline-flex rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
          {t.trialExpired}
        </span>
      );
    }
    return <span className="text-xs text-muted-2">{t.trialNotStarted}</span>;
  };

  const lastSeen = (iso: string | null) => {
    if (!iso) return <span className="text-xs text-muted-2">{t.lastSeenNever}</span>;
    // Calendar-day difference (not a rolling 24h window) so a login yesterday
    // evening reads "πριν 1 ημ." instead of "Σήμερα".
    const startOfDay = (ms: number) => {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const days = Math.round(
      (startOfDay(Date.now()) - startOfDay(new Date(iso).getTime())) / 86_400_000,
    );
    const label =
      days <= 0 ? t.lastSeenToday : t.lastSeenDays.replace("{n}", String(days));
    const stale = days >= 30;
    return (
      <span
        title={new Date(iso).toLocaleString(locale === "el" ? "el-GR" : "en-GB")}
        className={`text-xs ${stale ? "font-medium text-warning" : "text-muted"}`}
      >
        {label}
      </span>
    );
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setConfirmDelete(null);
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.refresh();
    });

  const onToggle = (r: BizRow) =>
    run(() =>
      setBusinessStatus(locale, r.id, r.status === "active" ? "suspended" : "active"),
    );

  // "New" = registered within the last 7 days, so fresh stores stand out for review.
  const isNew = (r: BizRow) =>
    now - new Date(r.created_at).getTime() < 7 * 86_400_000;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {q ? t.noResults.replace("{q}", query) : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">{t.colName}</th>
                <th className="px-4 py-3 font-medium">{t.colOwner}</th>
                <th className="px-4 py-3 font-medium">{t.colCity}</th>
                <th className="px-4 py-3 font-medium">{t.colCategory}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 font-medium">{t.colTrial}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colBookings}</th>
                <th className="px-4 py-3 font-medium">{t.colCreated}</th>
                <th className="px-4 py-3 font-medium">{t.colLastSeen}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground">{r.name}</p>
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
                      {isNew(r) && (
                        <span className="inline-flex rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                          {t.badgeNew}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-2">/{r.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.owner_name || t.noOwner}</p>
                    {r.owner_email && (
                      <p className="text-xs text-muted-2">{r.owner_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.city || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.category_el || "—"}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{trialBadge(r)}</td>
                  <td className="px-4 py-3 text-right text-muted">{r.bookings_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lastSeen(r.owner_last_sign_in_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/${locale}/admin/businesses/${r.id}`}
                        title={t.actionReview}
                        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        <FileSearch className="size-4" />
                      </Link>
                      <a
                        href={`/${locale}/b/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.actionView}
                        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onToggle(r)}
                        disabled={pending}
                        title={r.status === "active" ? t.actionSuspend : t.actionActivate}
                        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                      >
                        {r.status === "active" ? (
                          <Ban className="size-4 text-warning" />
                        ) : (
                          <CheckCircle2 className="size-4 text-success" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(r)}
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

      {confirmDelete && (
        <ConfirmDialog
          title={t.actionDelete}
          message={t.confirmDelete.replace("{name}", confirmDelete.name)}
          danger
          pending={pending}
          onConfirm={() => run(() => deleteBusiness(locale, confirmDelete.id))}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
