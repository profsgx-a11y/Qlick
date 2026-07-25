"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarOff, Clock, Plus, Sparkles, Trash2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeSelect } from "@/components/ui/time-select";
import { DatePicker } from "../calendar/date-picker";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { greekHolidays } from "@/lib/greek-holidays";
import {
  saveClosure,
  deleteClosure,
  addClosedDays,
  type ClosureInput,
} from "./closures-actions";

export interface ClosureRow {
  date: string;
  is_closed: boolean;
  special_open_time: string | null;
  special_close_time: string | null;
  reason: string | null;
}

type ClosuresDict =
  ReturnType<typeof useDict>["dashboard"]["settings"]["closures"];

const todayStr = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function ClosuresEditor({
  locale,
  initial,
}: {
  locale: string;
  initial: ClosureRow[];
}) {
  const dd = useDict().dashboard;
  const c = dd.settings.closures;
  const [rows, setRows] = useState<ClosureRow[]>(initial);
  useEffect(() => setRows(initial), [initial]);

  const [mode, setMode] = useState<"add" | "holidays" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${d}T12:00:00Z`));

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    [rows],
  );
  const today = todayStr();

  const applySave = (input: ClosureInput, onOk: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await saveClosure(locale, input);
      if (res.ok) {
        setRows((prev) => {
          const rest = prev.filter((r) => r.date !== input.date);
          return [
            ...rest,
            {
              date: input.date,
              is_closed: input.is_closed,
              special_open_time: input.special_open_time,
              special_close_time: input.special_close_time,
              reason: input.reason,
            },
          ];
        });
        onOk();
      } else {
        setError(dashErr(dd.errors, res.error, c.save));
      }
    });
  };

  const remove = (date: string) => {
    setRows((prev) => prev.filter((r) => r.date !== date)); // optimistic
    startTransition(async () => {
      const res = await deleteClosure(locale, date);
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, c.save));
        setRows(initial); // revert to server truth
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
          {c.title}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setError(null);
              setMode(mode === "holidays" ? null : "holidays");
            }}
          >
            <Sparkles className="size-4" />
            {c.addHolidays}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setMode(mode === "add" ? null : "add");
            }}
          >
            <Plus className="size-4" />
            {c.add}
          </Button>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-2">{c.subtitle}</p>

      {mode === "add" && (
        <AddForm
          c={c}
          locale={locale}
          onCancel={() => setMode(null)}
          onSave={(input) => applySave(input, () => setMode(null))}
        />
      )}

      {mode === "holidays" && (
        <HolidaysPanel
          c={c}
          existing={new Set(rows.map((r) => r.date))}
          today={today}
          fmtDate={fmtDate}
          onCancel={() => setMode(null)}
          onAdd={(days, onOk) => {
            setError(null);
            startTransition(async () => {
              const res = await addClosedDays(locale, days);
              if (res.ok) {
                setRows((prev) => {
                  const map = new Map(prev.map((r) => [r.date, r]));
                  for (const d of days)
                    map.set(d.date, {
                      date: d.date,
                      is_closed: true,
                      special_open_time: null,
                      special_close_time: null,
                      reason: d.reason,
                    });
                  return Array.from(map.values());
                });
                onOk();
              } else {
                setError(dashErr(dd.errors, res.error, c.save));
              }
            });
          }}
        />
      )}

      {error && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          {c.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => {
            const past = r.date < today;
            return (
              <li
                key={r.date}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2",
                  past && "opacity-55",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-md",
                    r.is_closed
                      ? "bg-danger/10 text-danger"
                      : "bg-gold/10 text-gold",
                  )}
                >
                  {r.is_closed ? (
                    <CalendarOff className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-foreground">
                    <span>{fmtDate(r.date)}</span>
                    {past && (
                      <span className="rounded bg-surface-2 px-1.5 text-[10px] uppercase text-muted-2">
                        {c.past}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {r.is_closed
                      ? c.closedAllDay
                      : `${c.specialHours} · ${hhmm(r.special_open_time)}–${hhmm(r.special_close_time)}`}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.date)}
                  aria-label={c.remove}
                  title={c.remove}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Inline "add a single day" form. */
function AddForm({
  c,
  locale,
  onCancel,
  onSave,
}: {
  c: ClosuresDict;
  locale: string;
  onCancel: () => void;
  onSave: (input: ClosureInput) => void;
}) {
  const cal = useDict().dashboard.calendar;
  const [date, setDate] = useState(todayStr());
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("14:00");
  const [reason, setReason] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const submit = () => {
    if (!date) return setLocalErr(c.dateLabel);
    onSave({
      date,
      is_closed: closed,
      special_open_time: closed ? null : open,
      special_close_time: closed ? null : close,
      reason: reason.trim() || null,
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-gold-soft bg-surface/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Inline calendar (no popover, so it never covers the fields) */}
        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase text-muted-2">
            {c.dateLabel}
          </span>
          <DatePicker
            inline
            value={date}
            today={todayStr()}
            locale={locale}
            todayLabel={cal.backToday}
            prevLabel={cal.prev}
            nextLabel={cal.next}
            onSelect={setDate}
          />
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3">
          {/* Closed / special toggle */}
          <div className="flex w-fit overflow-hidden rounded-lg border border-border text-xs font-medium">
            <button
              type="button"
              onClick={() => setClosed(true)}
              className={cn(
                "px-3 py-2 transition-colors",
                closed ? "bg-danger/15 text-danger" : "text-muted hover:text-foreground",
              )}
            >
              {c.typeClosed}
            </button>
            <button
              type="button"
              onClick={() => setClosed(false)}
              className={cn(
                "border-l border-border px-3 py-2 transition-colors",
                !closed ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground",
              )}
            >
              {c.typeSpecial}
            </button>
          </div>

          {!closed && (
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase text-muted-2">
                  {c.fromLabel}
                </span>
                <TimeSelect value={open} onChange={setOpen} />
              </label>
              <span className="pb-2 text-muted-2">—</span>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase text-muted-2">
                  {c.toLabel}
                </span>
                <TimeSelect value={close} onChange={setClose} />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase text-muted-2">
              {c.reasonLabel}
            </span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={c.reasonPlaceholder}
              maxLength={120}
              className="h-9"
            />
          </label>

          {localErr && <p className="text-xs text-danger">{localErr}</p>}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {c.cancel}
            </Button>
            <Button size="sm" onClick={submit}>
              {c.save}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline "pick Greek holidays for a year" panel. */
function HolidaysPanel({
  c,
  existing,
  today,
  fmtDate,
  onCancel,
  onAdd,
}: {
  c: ClosuresDict;
  existing: Set<string>;
  today: string;
  fmtDate: (d: string) => string;
  onCancel: () => void;
  onAdd: (
    days: { date: string; reason: string | null }[],
    onOk: () => void,
  ) => void;
}) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const names = c.holidayNames as Record<string, string>;

  // Upcoming, not-yet-declared holidays for the chosen year.
  const items = useMemo(
    () =>
      greekHolidays(year).filter(
        (h) => h.date >= today && !existing.has(h.date),
      ),
    [year, today, existing],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Default-select everything whenever the visible list changes.
  useEffect(() => {
    setSelected(new Set(items.map((h) => h.date)));
  }, [items]);

  const toggle = (date: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  const submit = () => {
    const days = items
      .filter((h) => selected.has(h.date))
      .map((h) => ({ date: h.date, reason: names[h.id] ?? null }));
    if (days.length === 0) return;
    onAdd(days, () => onCancel());
  };

  return (
    <div className="mb-4 rounded-xl border border-gold-soft bg-surface/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">
          {c.holidaysTitle.replace("{year}", String(year))}
        </h4>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs font-medium">
          {[thisYear, thisYear + 1].map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                "rounded-md px-2 py-1 transition-colors",
                y === year ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-2">{c.holidaysSubtitle}</p>

      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{c.empty}</p>
      ) : (
        <>
          <div className="mb-2 flex gap-3 text-[11px] font-medium text-gold">
            <button
              type="button"
              onClick={() => setSelected(new Set(items.map((h) => h.date)))}
              className="hover:underline"
            >
              {c.holidaysAll}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-muted hover:underline"
            >
              {c.holidaysNone}
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-auto pr-1">
            {items.map((h) => {
              const on = selected.has(h.date);
              return (
                <li key={h.date}>
                  <button
                    type="button"
                    onClick={() => toggle(h.date)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      on
                        ? "border-gold/40 bg-gold/10"
                        : "border-border hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        on ? "border-gold bg-gold text-black" : "border-muted-2",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="flex-1 text-sm text-foreground">
                      {names[h.id] ?? h.id}
                    </span>
                    <span className="text-xs text-muted">{fmtDate(h.date)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {c.cancel}
        </Button>
        <Button size="sm" onClick={submit} disabled={selected.size === 0}>
          <Plus className="size-4" />
          {c.holidaysAdd}
        </Button>
      </div>
    </div>
  );
}
