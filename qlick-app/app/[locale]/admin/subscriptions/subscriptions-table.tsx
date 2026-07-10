"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ExternalLink,
  CalendarPlus,
  Euro,
  CreditCard,
  Hourglass,
  AlertTriangle,
  X,
} from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { extendTrial } from "./actions";

interface SubRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  plan_expires_at: string | null;
  published_at: string | null;
  created_at: string;
  trial_bonus_days: number;
  trial_total_days: number;
  sub_state: string;
  days_left: number | null;
  owner_name: string | null;
  owner_email: string | null;
}

const MONTHLY_CENTS = 900;
const YEARLY_CENTS = 8900;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Urgent things first: running trials by days left, then paid, then lapsed.
const STATE_ORDER: Record<string, number> = {
  trialing: 0,
  paid: 1,
  trial_expired: 2,
  paid_expired: 3,
  not_published: 4,
};

export function SubscriptionsTable({
  locale,
  rows,
}: {
  locale: string;
  rows: SubRow[];
}) {
  const t = useDict().admin.subscriptions;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [extendFor, setExtendFor] = useState<SubRow | null>(null);
  const [days, setDays] = useState(30);

  const summary = useMemo(() => {
    const paid = rows.filter((r) => r.sub_state === "paid");
    const mrrCents = paid.reduce(
      (sum, r) =>
        sum + (r.plan === "monthly" ? MONTHLY_CENTS : Math.round(YEARLY_CENTS / 12)),
      0,
    );
    return {
      mrrCents,
      paying: paid.length,
      monthly: paid.filter((r) => r.plan === "monthly").length,
      yearly: paid.filter((r) => r.plan === "yearly").length,
      trialing: rows.filter((r) => r.sub_state === "trialing").length,
      expiring: rows.filter(
        (r) => r.sub_state === "trialing" && r.days_left !== null && r.days_left <= 7,
      ).length,
      expired: rows.filter((r) => r.sub_state === "trial_expired").length,
    };
  }, [rows]);

  const q = norm(query.trim());
  const filtered = useMemo(() => {
    const base = !q
      ? rows
      : rows.filter((r) =>
          [r.name, r.owner_name, r.owner_email]
            .filter(Boolean)
            .some((v) => norm(String(v)).includes(q)),
        );
    return [...base].sort((a, b) => {
      const so = (STATE_ORDER[a.sub_state] ?? 9) - (STATE_ORDER[b.sub_state] ?? 9);
      if (so !== 0) return so;
      return (a.days_left ?? 9999) - (b.days_left ?? 9999);
    });
  }, [rows, q]);

  const dtLocale = locale === "el" ? "el-GR" : "en-GB";
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dtLocale) : "—";
  const fmtEuro = (cents: number) =>
    `${(cents / 100).toFixed(2).replace(/\.00$/, "")} €`;

  const planBadge = (r: SubRow) => {
    if (r.plan === "monthly")
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
          {t.planMonthly}
        </span>
      );
    if (r.plan === "yearly")
      return (
        <span className="inline-flex whitespace-nowrap rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
          {t.planYearly}
        </span>
      );
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
        {t.planFree}
      </span>
    );
  };

  const stateBadge = (r: SubRow) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: t.statePaid, cls: "bg-success/15 text-success" },
      paid_expired: { label: t.statePaidExpired, cls: "bg-danger/15 text-danger" },
      trialing: {
        label: t.stateTrialing,
        cls:
          r.days_left !== null && r.days_left <= 7
            ? "bg-warning/15 text-warning"
            : "bg-gold/15 text-gold",
      },
      trial_expired: { label: t.stateTrialExpired, cls: "bg-danger/15 text-danger" },
      not_published: { label: t.stateNotPublished, cls: "bg-surface-3 text-muted" },
    };
    const m = map[r.sub_state] ?? { label: r.sub_state, cls: "bg-surface-3 text-muted" };
    return (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}
      >
        {m.label}
      </span>
    );
  };

  const expiresAt = (r: SubRow): string => {
    if (r.sub_state === "paid" || r.sub_state === "paid_expired")
      return fmtDate(r.plan_expires_at);
    if (!r.published_at) return "—";
    const end = new Date(r.published_at);
    end.setDate(end.getDate() + r.trial_total_days);
    return fmtDate(end.toISOString());
  };

  const openExtend = (r: SubRow) => {
    setDays(30);
    setExtendFor(r);
  };

  const onExtend = () =>
    startTransition(async () => {
      if (!extendFor) return;
      const res = await extendTrial(locale, extendFor.id, days);
      setExtendFor(null);
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.refresh();
    });

  const cards = [
    {
      icon: <Euro className="size-4" />,
      label: t.mrr,
      value: fmtEuro(summary.mrrCents),
      sub: t.mrrNote,
    },
    {
      icon: <CreditCard className="size-4" />,
      label: t.paying,
      value: String(summary.paying),
      sub: `${summary.monthly} × ${t.planMonthly} · ${summary.yearly} × ${t.planYearly}`,
    },
    {
      icon: <Hourglass className="size-4" />,
      label: t.inTrial,
      value: String(summary.trialing),
      sub: null,
    },
    {
      icon: <AlertTriangle className="size-4" />,
      label: t.expiring7d,
      value: String(summary.expiring),
      warn: summary.expiring > 0,
      sub: null,
    },
    {
      icon: <X className="size-4" />,
      label: t.expired,
      value: String(summary.expired),
      warn: summary.expired > 0,
      sub: null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">{c.label}</p>
              <span className="text-muted-2">{c.icon}</span>
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${
                "warn" in c && c.warn ? "text-warning" : "text-foreground"
              }`}
            >
              {c.value}
            </p>
            {c.sub && <p className="mt-1 text-[11px] leading-snug text-muted-2">{c.sub}</p>}
          </div>
        ))}
      </div>

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
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">{t.colBusiness}</th>
                <th className="px-4 py-3 font-medium">{t.colOwner}</th>
                <th className="px-4 py-3 font-medium">{t.colPlan}</th>
                <th className="px-4 py-3 font-medium">{t.colState}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colDaysLeft}</th>
                <th className="px-4 py-3 font-medium">{t.colExpires}</th>
                <th className="px-4 py-3 text-right font-medium">{t.colBonus}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/${locale}/admin/businesses/${r.id}`}
                        className="font-medium text-foreground hover:text-gold"
                      >
                        {r.name}
                      </Link>
                      <a
                        href={`/${locale}/b/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-2 hover:text-gold"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-2">/{r.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.owner_name || "—"}</p>
                    {r.owner_email && (
                      <p className="text-xs text-muted-2">{r.owner_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{planBadge(r)}</td>
                  <td className="px-4 py-3">{stateBadge(r)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {r.days_left !== null ? (
                      <span
                        className={`font-semibold ${
                          r.days_left <= 7 ? "text-warning" : "text-foreground"
                        }`}
                      >
                        {t.daysShort.replace("{n}", String(r.days_left))}
                      </span>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{expiresAt(r)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-muted">
                    {r.trial_bonus_days > 0 ? `+${r.trial_bonus_days}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openExtend(r)}
                        disabled={pending}
                        title={t.actionExtend}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                      >
                        <CalendarPlus className="size-4" />
                        {t.actionExtend}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Extend-trial dialog */}
      {extendFor && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => !pending && setExtendFor(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold text-foreground">
                {t.extendTitle}
              </h3>
              <button
                onClick={() => setExtendFor(null)}
                disabled={pending}
                aria-label={t.extendCancel}
                className="text-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              {t.extendHint.replace("{name}", extendFor.name)}
            </p>
            <div className="mt-4 flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
                  {t.extendDays}
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) =>
                    setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))
                  }
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </label>
              {[7, 30, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={`h-10 rounded-lg border px-3 text-sm font-medium transition-colors ${
                    days === n
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-border text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  +{n}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setExtendFor(null)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              >
                {t.extendCancel}
              </button>
              <button
                onClick={onExtend}
                disabled={pending}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold/90 disabled:opacity-40"
              >
                {t.extendConfirm}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
