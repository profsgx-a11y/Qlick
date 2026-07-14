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
  CalendarPlus,
  Check,
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
} from "./actions";
import {
  cancelSeriesBooking,
  rescheduleSeriesBooking,
} from "./recurring-actions";
import { DatePicker } from "../calendar/date-picker";
import { availableMoveSlots } from "../calendar/actions";
import {
  AppointmentBooker,
  type ServiceOption,
  type StaffOption,
} from "./appointment-booker";

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
  const [nowMs] = useState(() => Date.now());
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
  const [showBooker, setShowBooker] = useState(false);
  // Inline reschedule of a single upcoming appointment in the history list.
  const [editOcc, setEditOcc] = useState<{
    id: string;
    date: string;
    selectedIso: string | null;
  } | null>(null);
  const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

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

  const cancelOccurrence = (bookingId: string) => {
    if (!detail) return;
    setRowError(null);
    startTransition(async () => {
      const res = await cancelSeriesBooking(locale, bookingId);
      if (res.ok) {
        void openDetail(detail.id);
        refresh(search);
      } else {
        setRowError(dashErr(d.errors, res.error, d.genericError));
      }
    });
  };

  const dateForInput = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  const todayStr = dateForInput(new Date(nowMs).toISOString());

  const loadSlots = (bookingId: string, date: string, keepIso: string | null) => {
    setSlotsLoading(true);
    setSlots([]);
    startTransition(async () => {
      const res = await availableMoveSlots({ bookingId, date });
      setSlotsLoading(false);
      const list = res.ok ? res.slots ?? [] : [];
      setSlots(list);
      // Keep the current time selected if it's still offered on this day.
      setEditOcc((prev) =>
        prev && prev.id === bookingId
          ? {
              ...prev,
              selectedIso:
                keepIso && list.some((s) => s.iso === keepIso) ? keepIso : null,
            }
          : prev,
      );
    });
  };

  const startEditOcc = (bookingId: string, startsAtIso: string) => {
    setRowError(null);
    const date = dateForInput(startsAtIso);
    setEditOcc({ id: bookingId, date, selectedIso: startsAtIso });
    loadSlots(bookingId, date, startsAtIso);
  };

  const changeEditDate = (date: string) => {
    if (!editOcc) return;
    setEditOcc({ ...editOcc, date, selectedIso: null });
    loadSlots(editOcc.id, date, null);
  };

  const saveEditOcc = () => {
    if (!editOcc || !editOcc.selectedIso || !detail) return;
    const { id, selectedIso } = editOcc;
    setRowError(null);
    startTransition(async () => {
      const res = await rescheduleSeriesBooking(locale, id, selectedIso);
      if (res.ok) {
        setEditOcc(null);
        void openDetail(detail.id);
        refresh(search);
      } else {
        setRowError(dashErr(d.errors, res.error, d.genericError));
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

                  {/* Book a new appointment */}
                  <div>
                    <button
                      onClick={() => setShowBooker(true)}
                      disabled={services.length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/15 disabled:opacity-40"
                    >
                      <CalendarPlus className="size-4" />
                      {t.booker.title}
                    </button>
                    {services.length === 0 && (
                      <p className="mt-1.5 text-xs text-muted">
                        {t.booker.needService}
                      </p>
                    )}
                  </div>

                  {/* History */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      {t.historyTitle}
                    </h4>
                    {rowError && (
                      <p className="mb-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                        {rowError}
                      </p>
                    )}
                    {detail.bookings.length === 0 ? (
                      <p className="text-sm text-muted">{t.historyEmpty}</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.bookings.map((b) => {
                          const upcoming =
                            (b.status === "pending" ||
                              b.status === "confirmed") &&
                            Date.parse(b.startsAtIso) >= nowMs;

                          if (editOcc?.id === b.id) {
                            return (
                              <div
                                key={b.id}
                                className="rounded-lg border border-gold/30 bg-surface-2/40 px-3 py-3"
                              >
                                <DatePicker
                                  inline
                                  value={editOcc.date}
                                  today={todayStr}
                                  locale={locale}
                                  todayLabel={t.booker.today}
                                  prevLabel={t.booker.prevMonth}
                                  nextLabel={t.booker.nextMonth}
                                  onSelect={changeEditDate}
                                />
                                <div className="mt-3">
                                  {slotsLoading ? (
                                    <p className="text-xs text-muted">
                                      {t.booker.loading}
                                    </p>
                                  ) : slots.length === 0 ? (
                                    <p className="text-xs text-muted">
                                      {t.booker.noSlots}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                                      {slots.map((s) => (
                                        <button
                                          key={s.iso}
                                          onClick={() =>
                                            setEditOcc({
                                              ...editOcc,
                                              selectedIso: s.iso,
                                            })
                                          }
                                          className={cn(
                                            "rounded-lg border px-2 py-1.5 text-xs tabular-nums transition-colors",
                                            editOcc.selectedIso === s.iso
                                              ? "border-gold bg-gold font-semibold text-black"
                                              : "border-border text-foreground hover:border-gold/40",
                                          )}
                                        >
                                          {s.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    onClick={saveEditOcc}
                                    disabled={isPending || !editOcc.selectedIso}
                                    className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
                                  >
                                    <Check className="size-3.5" />
                                    {d.save}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditOcc(null);
                                      setSlots([]);
                                    }}
                                    disabled={isPending}
                                    className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
                                  >
                                    {d.cancel}
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
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
                              <div className="flex shrink-0 items-center gap-3">
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      STATUS_TONE[b.status] ??
                                        "bg-surface-2 text-muted",
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
                                {upcoming && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        startEditOcc(b.id, b.startsAtIso)
                                      }
                                      disabled={isPending}
                                      aria-label={t.booker.reschedule}
                                      className="text-muted transition-colors hover:text-gold disabled:opacity-40"
                                    >
                                      <Pencil className="size-4" />
                                    </button>
                                    <button
                                      onClick={() => cancelOccurrence(b.id)}
                                      disabled={isPending}
                                      aria-label={t.booker.cancelAppt}
                                      className="text-muted transition-colors hover:text-danger disabled:opacity-40"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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

      {showBooker && detail && (
        <AppointmentBooker
          locale={locale}
          tz={tz}
          businessCustomerId={detail.id}
          services={services}
          staff={staff}
          onClose={() => setShowBooker(false)}
          onBooked={() => void openDetail(detail.id)}
        />
      )}

    </div>
  );
}
