"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Phone,
  Trash2,
  Pencil,
  StickyNote,
  Users,
  BadgeCheck,
  CalendarClock,
  Repeat,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { formatPrice, formatDateTime } from "@/lib/format";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type CustomerListItem,
  type CustomerDetail,
  type CustomerSeries,
} from "./actions";
import { endSeries, cancelSeriesBooking } from "./recurring-actions";
import {
  RecurringBuilder,
  type ServiceOption,
  type StaffOption,
} from "./recurring-builder";

interface Props {
  locale: string;
  tz: string;
  initialCustomers: CustomerListItem[];
  services: ServiceOption[];
  staff: StaffOption[];
}

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
};

const STATUS_TONE: Record<string, string> = {
  completed: "bg-success/15 text-success",
  confirmed: "bg-gold/10 text-gold ring-1 ring-inset ring-gold/20",
  pending: "bg-surface-2 text-muted",
  cancelled: "bg-danger/10 text-danger",
  no_show: "bg-danger/10 text-danger",
};

export function CustomersManager({
  locale,
  tz,
  initialCustomers,
  services,
  staff,
}: Props) {
  const d = useDict().dashboard;
  const t = d.customers;

  const [customers, setCustomers] = useState<CustomerListItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail drawer
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const [confirmDel, setConfirmDel] = useState<CustomerDetail | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [manageSeries, setManageSeries] = useState<CustomerSeries | null>(null);
  const [confirmEndSeries, setConfirmEndSeries] = useState<CustomerSeries | null>(
    null,
  );

  const refresh = useCallback(
    (q: string) => {
      startTransition(async () => {
        const res = await listCustomers(q);
        if (res.ok) setCustomers(res.customers ?? []);
      });
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => refresh(search), 250);
    return () => clearTimeout(id);
  }, [search, refresh]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const submitForm = () => {
    setFormError(null);
    startTransition(async () => {
      const res = editingId
        ? await updateCustomer(locale, editingId, form)
        : await createCustomer(locale, form);
      if (!res.ok) {
        setFormError(dashErr(d.errors, res.error, d.genericError));
        return;
      }
      setShowForm(false);
      setEditingId(null);
      refresh(search);
      if (editingId && detailId === editingId) void openDetail(editingId);
    });
  };

  const openDetail = useCallback(
    async (id: string) => {
      setDetailId(id);
      setDetail(null);
      setDetailLoading(true);
      setNoteSaved(false);
      const res = await getCustomer(id);
      setDetailLoading(false);
      if (res.ok && res.customer) {
        setDetail(res.customer);
        setNoteDraft(res.customer.notes ?? "");
      }
    },
    [],
  );

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
  };

  const saveNote = () => {
    if (!detail) return;
    startTransition(async () => {
      const res = await updateCustomer(locale, detail.id, {
        firstName: detail.firstName ?? "",
        lastName: detail.lastName ?? "",
        phone: detail.phone ?? "",
        email: detail.email ?? "",
        notes: noteDraft,
      });
      if (res.ok) {
        setNoteSaved(true);
        setDetail({ ...detail, notes: noteDraft.trim() || null });
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === detail.id ? { ...c, hasNote: !!noteDraft.trim() } : c,
          ),
        );
      }
    });
  };

  const editFromDetail = () => {
    if (!detail) return;
    setEditingId(detail.id);
    setForm({
      firstName: detail.firstName ?? "",
      lastName: detail.lastName ?? "",
      phone: detail.phone ?? "",
      email: detail.email ?? "",
      notes: detail.notes ?? "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const doDelete = () => {
    if (!confirmDel) return;
    const id = confirmDel.id;
    setConfirmDel(null);
    startTransition(async () => {
      const res = await deleteCustomer(locale, id);
      if (res.ok) {
        closeDetail();
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      }
    });
  };

  const displayName = (c: { firstName: string | null; lastName: string | null }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || t.noName;

  const seriesLabel = (s: CustomerSeries): string => {
    const tr = t.recurring;
    const wd = (tr.weekdays as string[])[s.weekday ?? 0] ?? "";
    const n = s.intervalN;
    const freq =
      s.patternType === "weekly"
        ? n === 1
          ? tr.weeklyOne
          : tr.weeklyEvery.replace("{n}", String(n))
        : n === 1
          ? tr.monthlyOne
          : tr.monthlyEvery.replace("{n}", String(n));
    if (s.patternType === "weekly")
      return `${freq} · ${wd} ${s.timeOfDay}`;
    if (s.patternType === "monthly_dom")
      return `${freq} · ${tr.dayShort} ${s.dayOfMonth} · ${s.timeOfDay}`;
    const nthLabel =
      s.nth === -1
        ? (tr.nthOptions as string[])[5]
        : (tr.nthOptions as string[])[(s.nth ?? 1) - 1];
    return `${freq} · ${nthLabel} ${wd} · ${s.timeOfDay}`;
  };

  const doEndSeries = () => {
    if (!confirmEndSeries || !detail) return;
    const id = confirmEndSeries.id;
    setConfirmEndSeries(null);
    setManageSeries(null);
    startTransition(async () => {
      const res = await endSeries(locale, id);
      if (res.ok) {
        void openDetail(detail.id);
        refresh(search);
      }
    });
  };

  const cancelOccurrence = (bookingId: string) => {
    if (!detail) return;
    startTransition(async () => {
      const res = await cancelSeriesBooking(locale, bookingId);
      if (res.ok) {
        void openDetail(detail.id);
        refresh(search);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="pl-9"
          />
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus />
          {t.new}
        </Button>
      </div>

      {/* List */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users />}
          message={search ? t.noResults : t.empty}
          action={
            !search ? (
              <Button onClick={openAdd}>
                <Plus />
                {t.new}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {customers.map((c, i) => (
            <Card
              key={c.id}
              onClick={() => openDetail(c.id)}
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
              className="group flex cursor-pointer items-center gap-4 py-4 transition-transform duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
                <span className="text-sm font-bold">
                  {(c.firstName?.[0] ?? c.phone?.[0] ?? "?").toUpperCase()}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-semibold text-foreground">
                    {displayName(c)}
                  </h4>
                  {c.hasAccount ? (
                    <span
                      title={t.badgeAccount}
                      className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success"
                    >
                      <BadgeCheck className="size-3" />
                      {t.badgeAccount}
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                      {t.badgeManual}
                    </span>
                  )}
                  {c.hasNote && (
                    <StickyNote
                      className="size-3.5 shrink-0 text-gold/70"
                      aria-label={t.hasNote}
                    />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {c.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" />
                      {c.phone}
                    </span>
                  )}
                  <span>{t.visitsN.replace("{n}", String(c.visits))}</span>
                  {c.lastVisitIso ? (
                    <span>
                      {t.lastVisit.replace(
                        "{d}",
                        formatDateTime(c.lastVisitIso, tz, locale),
                      )}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {c.upcoming > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold ring-1 ring-inset ring-gold/20">
                    <CalendarClock className="size-3.5" />
                    {t.upcomingN.replace("{n}", String(c.upcoming))}
                  </span>
                )}
                {c.totalSpentCents > 0 && (
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(c.totalSpentCents, locale)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => !isPending && setShowForm(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                {editingId ? t.editTitle : t.addTitle}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted hover:text-foreground"
                aria-label={d.close}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.firstName} htmlFor="cust-first">
                  <Input
                    id="cust-first"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    disabled={isPending}
                  />
                </Field>
                <Field label={t.lastName} htmlFor="cust-last">
                  <Input
                    id="cust-last"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    disabled={isPending}
                  />
                </Field>
              </div>

              <Field label={t.phone} htmlFor="cust-phone">
                <Input
                  id="cust-phone"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+30 …"
                  disabled={isPending}
                />
              </Field>

              <Field label={t.emailOptional} htmlFor="cust-email">
                <Input
                  id="cust-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={isPending}
                />
              </Field>

              <Field label={t.notesLabel} htmlFor="cust-notes">
                <Textarea
                  id="cust-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t.notesPlaceholder}
                  disabled={isPending}
                />
              </Field>

              {formError && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <div className="flex gap-3">
                <Button onClick={submitForm} disabled={isPending}>
                  {isPending ? d.saving : editingId ? d.save : d.add}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isPending}
                >
                  {d.cancel}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail drawer */}
      {detailId && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={closeDetail}
          />
          <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-lg font-bold text-foreground">
                {detail ? displayName(detail) : t.loading}
              </h3>
              <button
                onClick={closeDetail}
                className="text-muted hover:text-foreground"
                aria-label={d.close}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {detailLoading || !detail ? (
                <p className="text-sm text-muted">{t.loading}</p>
              ) : (
                <div className="space-y-6">
                  {/* Contact + badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {detail.hasAccount ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">
                        <BadgeCheck className="size-3.5" />
                        {t.badgeAccount}
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                        {t.badgeManual}
                      </span>
                    )}
                    {detail.phone && (
                      <a
                        href={`tel:${detail.phone}`}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                      >
                        <Phone className="size-3.5" />
                        {detail.phone}
                      </a>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-3 text-center">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {detail.visits}
                      </p>
                      <p className="text-[11px] text-muted">{t.statVisits}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-3 text-center">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {formatPrice(detail.totalSpentCents, locale)}
                      </p>
                      <p className="text-[11px] text-muted">{t.statSpent}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-3 text-center">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {detail.lastVisitIso
                          ? formatDateTime(detail.lastVisitIso, tz, locale)
                          : "—"}
                      </p>
                      <p className="text-[11px] text-muted">{t.statLast}</p>
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {t.notesLabel}
                    </label>
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => {
                        setNoteDraft(e.target.value);
                        setNoteSaved(false);
                      }}
                      placeholder={t.notesPlaceholder}
                      disabled={isPending}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        onClick={saveNote}
                        disabled={isPending || noteDraft === (detail.notes ?? "")}
                      >
                        {isPending ? d.saving : d.save}
                      </Button>
                      {noteSaved && (
                        <span className="text-xs text-success">{d.saved}</span>
                      )}
                    </div>
                  </div>

                  {/* Recurring series */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">
                        {t.recurring.sectionTitle}
                      </h4>
                      <button
                        onClick={() => setShowRecurring(true)}
                        disabled={services.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold ring-1 ring-inset ring-gold/20 transition-colors hover:bg-gold/15 disabled:opacity-40"
                      >
                        <Repeat className="size-3.5" />
                        {t.recurring.new}
                      </button>
                    </div>
                    {detail.series.length === 0 ? (
                      <p className="text-xs text-muted">
                        {services.length === 0
                          ? t.recurring.needService
                          : t.recurring.none}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detail.series.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {s.serviceName ?? "—"}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {seriesLabel(s)}
                              </p>
                              {s.nextIso && (
                                <p className="truncate text-[11px] text-gold/80">
                                  {t.recurring.next.replace(
                                    "{d}",
                                    formatDateTime(s.nextIso, tz, locale),
                                  )}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setManageSeries(s)}
                              className="inline-flex shrink-0 items-center gap-1 text-xs text-gold hover:text-gold/80"
                            >
                              <Pencil className="size-3.5" />
                              {t.recurring.manage}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* History */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      {t.historyTitle}
                    </h4>
                    {detail.bookings.length === 0 ? (
                      <p className="text-sm text-muted">{t.historyEmpty}</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.bookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/30 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {b.serviceName ?? "—"}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {formatDateTime(b.startsAtIso, tz, locale)}
                                {b.staffName ? ` · ${b.staffName}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  STATUS_TONE[b.status] ?? "bg-surface-2 text-muted",
                                )}
                              >
                                {(t.status as Record<string, string>)[
                                  b.status
                                ] ?? b.status}
                              </span>
                              <span className="text-xs tabular-nums text-muted">
                                {formatPrice(b.priceCents, locale)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {detail && (
              <div className="flex items-center gap-3 border-t border-border px-5 py-4">
                {!detail.hasAccount && (
                  <>
                    <Button variant="ghost" onClick={editFromDetail}>
                      <Pencil className="size-4" />
                      {d.edit}
                    </Button>
                    <button
                      onClick={() => setConfirmDel(detail)}
                      className="ml-auto inline-flex items-center gap-1.5 text-sm text-danger hover:text-danger/80"
                    >
                      <Trash2 className="size-4" />
                      {d.delete}
                    </button>
                  </>
                )}
                {detail.hasAccount && (
                  <p className="text-xs text-muted">{t.accountHint}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {confirmDel && (
        <ConfirmDialog
          title={t.deleteTitle}
          message={t.deleteConfirm.replace("{name}", displayName(confirmDel))}
          confirmLabel={d.delete}
          danger
          pending={isPending}
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {confirmEndSeries && (
        <ConfirmDialog
          title={t.recurring.endTitle}
          message={t.recurring.endConfirm}
          confirmLabel={t.recurring.end}
          danger
          pending={isPending}
          onConfirm={doEndSeries}
          onCancel={() => setConfirmEndSeries(null)}
        />
      )}

      {showRecurring && detail && (
        <RecurringBuilder
          locale={locale}
          tz={tz}
          businessCustomerId={detail.id}
          services={services}
          staff={staff}
          onClose={() => setShowRecurring(false)}
          onCreated={() => void openDetail(detail.id)}
        />
      )}

      {manageSeries && detail && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/50"
            onClick={() => setManageSeries(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[90] flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-foreground">
                  {t.recurring.manageTitle}
                </h3>
                <button
                  onClick={() => setManageSeries(null)}
                  className="text-muted hover:text-foreground"
                  aria-label={d.close}
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                {manageSeries.serviceName} · {seriesLabel(manageSeries)}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(() => {
                const occ = detail.bookings
                  .filter(
                    (b) =>
                      b.seriesId === manageSeries.id &&
                      (b.status === "pending" || b.status === "confirmed") &&
                      Date.parse(b.startsAtIso) >= Date.now(),
                  )
                  .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
                if (occ.length === 0)
                  return (
                    <p className="text-sm text-muted">{t.recurring.occEmpty}</p>
                  );
                return (
                  <div className="space-y-2">
                    {occ.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/30 px-3 py-2"
                      >
                        <span className="text-sm text-foreground">
                          {formatDateTime(b.startsAtIso, tz, locale)}
                        </span>
                        <button
                          onClick={() => cancelOccurrence(b.id)}
                          disabled={isPending}
                          aria-label={t.recurring.occCancel}
                          className="shrink-0 text-muted transition-colors hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                onClick={() => {
                  const s = manageSeries;
                  setManageSeries(null);
                  setConfirmEndSeries(s);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-danger hover:text-danger/80"
              >
                <Trash2 className="size-4" />
                {t.recurring.endAll}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
