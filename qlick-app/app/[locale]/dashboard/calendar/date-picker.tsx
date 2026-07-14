"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
};

interface DatePickerProps {
  /** Selected date, `YYYY-MM-DD`. */
  value: string;
  /** Today, `YYYY-MM-DD` (in the business timezone). */
  today: string;
  locale: string;
  todayLabel: string;
  prevLabel: string;
  nextLabel: string;
  onSelect: (date: string) => void;
  /** Render the calendar always-visible in the flow (no popover trigger). */
  inline?: boolean;
}

/**
 * Premium, fully-custom date picker — replaces the native `<input type=date>`
 * with an on-brand dark/gold calendar popover (origin-aware pop, hover lift,
 * keyboard + outside-click dismiss). Works on the calendar's `YYYY-MM-DD`
 * strings directly, so it stays timezone-safe.
 */
export function DatePicker({
  value,
  today,
  locale,
  todayLabel,
  prevLabel,
  nextLabel,
  onSelect,
  inline = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const sel = parse(value);
  // Month shown in the popup; reset to the selected month each time it opens.
  const [cursor, setCursor] = useState({ y: sel.y, m: sel.m });
  const rootRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open) setCursor({ y: sel.y, m: sel.m });
    setOpen((v) => !v);
  };

  // Dismiss on outside pointer + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  // Mon-first weekday headers (2024-01-01 was a Monday).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }),
  );

  // 6×7 grid starting on Monday.
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(cursor.y, cursor.m, 1 - startDow + i);
    return {
      str: toStr(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === cursor.m,
    };
  });

  const triggerLabel = new Date(sel.y, sel.m, sel.d).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (d: string) => {
    setOpen(false);
    onSelect(d);
  };

  const panel = (
    <>
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={prevLabel}
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {monthTitle}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={nextLabel}
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7">
        {weekdays.map((w, i) => (
          <span
            key={i}
            className="grid h-7 place-items-center text-[10px] font-semibold uppercase tracking-wide text-muted-2"
          >
            {w}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const isSelected = c.str === value;
          const isToday = c.str === today;
          return (
            <button
              key={c.str}
              type="button"
              onClick={() => pick(c.str)}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "m-0.5 grid size-8 place-items-center rounded-lg text-sm tabular-nums transition-[transform,background-color,color,box-shadow] duration-150 ease-[var(--ease-out)] hover:-translate-y-px active:scale-90",
                isSelected
                  ? "bg-gold font-semibold text-black [box-shadow:0_6px_18px_-6px_var(--gold-glow)]"
                  : isToday
                    ? "text-gold ring-1 ring-inset ring-gold/40 hover:bg-gold/10"
                    : c.inMonth
                      ? "text-foreground hover:bg-surface-2"
                      : "text-muted-2 hover:bg-surface-2",
              )}
            >
              {c.day}
            </button>
          );
        })}
      </div>

      {/* Jump to today */}
      <button
        type="button"
        onClick={() => pick(today)}
        className="mt-2 w-full rounded-lg border border-border py-1.5 text-xs font-medium text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold/40 hover:text-gold"
      >
        {todayLabel}
      </button>
    </>
  );

  // Inline: the calendar is part of the normal flow (no popover), so it never
  // overlaps sibling content or forces the container to scroll unexpectedly.
  if (inline) {
    return (
      <div className="w-full max-w-xs rounded-2xl border border-border bg-surface-2/40 p-3">
        {panel}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/15 px-3 py-1.5 text-sm font-medium text-gold transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-out)] hover:border-gold/60 hover:bg-gold/20 active:scale-[0.97]"
      >
        <CalendarIcon className="size-4 shrink-0" />
        <span className="tabular-nums">{triggerLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          className="animate-pop absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border bg-surface p-3 elev-card"
        >
          {panel}
        </div>
      )}
    </div>
  );
}
