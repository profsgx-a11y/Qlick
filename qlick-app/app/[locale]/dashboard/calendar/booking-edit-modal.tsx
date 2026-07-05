"use client";

import { useEffect, useState, useTransition } from "react";
import {
  X,
  Clock,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import {
  addDaysStr,
  localDateInZone,
  minLabel,
  minutesFromMidnight,
} from "@/lib/calendar";
import { availableMoveSlots, moveBooking, resizeBooking } from "./actions";

interface EditBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  staffId: string | null;
  customerName: string | null;
  serviceName: string | null;
}

interface Props {
  locale: string;
  tz: string;
  mode: "move" | "duration";
  booking: EditBooking;
  staffNameLabel: string;
  onClose: () => void;
  onMoved: (u: { startsAtIso: string; endsAtIso: string }) => void;
  onResized: (u: { endsAtIso: string }) => void;
}

const MIN_DURATION = 15;
const STEP = 15;

export function BookingEditModal({
  locale,
  tz,
  mode,
  booking,
  staffNameLabel,
  onClose,
  onMoved,
  onResized,
}: Props) {
  const dd = useDict().dashboard;
  const t = dd.calendar;
  const [tab, setTab] = useState<"move" | "duration">(mode);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startMin = minutesFromMidnight(booking.startsAt, tz);
  const currentDuration = Math.max(
    MIN_DURATION,
    Math.round(
      (new Date(booking.endsAt).getTime() -
        new Date(booking.startsAt).getTime()) /
        60_000,
    ),
  );

  // ---- Duration tab ----
  const [duration, setDuration] = useState(currentDuration);
  const newEndMin = startMin + duration;
  const applyDuration = () => {
    setError(null);
    const endsAtIso = new Date(
      new Date(booking.startsAt).getTime() + duration * 60_000,
    ).toISOString();
    startTransition(async () => {
      const res = await resizeBooking(locale, {
        bookingId: booking.id,
        endsAtIso,
      });
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, t.resizeFailed));
        return;
      }
      onResized({ endsAtIso });
    });
  };

  // ---- Move tab ----
  const today = localDateInZone(new Date().toISOString(), tz);
  const [day, setDay] = useState(localDateInZone(booking.startsAt, tz));
  const [slots, setSlots] = useState<{ iso: string; label: string }[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "move") return;
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    setSlots(null);
    setError(null);
    availableMoveSlots({ bookingId: booking.id, date: day }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, t.somethingWrong));
        setSlots([]);
        return;
      }
      setSlots(res.slots ?? []);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, day, booking.id]);

  const applyMove = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await moveBooking(locale, {
        bookingId: booking.id,
        startsAtIso: selected,
        staffId: booking.staffId,
      });
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, t.moveFailed));
        return;
      }
      onMoved({ startsAtIso: selected, endsAtIso: res.endsAtIso! });
    });
  };

  const dayLabel = (d: string) => {
    const [y, m, dnum] = d.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dnum, 12));
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(dt);
  };
  const canPrev = day > today;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => !pending && onClose()}
      />
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[380px] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border p-4">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-foreground">
              {tab === "move" ? t.editMoveTitle : t.editDurationTitle}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted">
              {[booking.customerName, booking.serviceName]
                .filter(Boolean)
                .join(" · ") || staffNameLabel}
            </p>
          </div>
          <button
            onClick={() => !pending && onClose()}
            className="shrink-0 text-muted hover:text-foreground"
            aria-label={dd.close}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border p-2">
          <button
            onClick={() => setTab("move")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === "move"
                ? "bg-gold/15 text-gold"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <CalendarClock className="size-4" />
            {t.tabTime}
          </button>
          <button
            onClick={() => setTab("duration")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === "duration"
                ? "bg-gold/15 text-gold"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Clock className="size-4" />
            {t.tabDuration}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "move" ? (
            <>
              {/* Day navigator */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => canPrev && setDay(addDaysStr(day, -1))}
                  disabled={!canPrev}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                  aria-label={t.prev}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <div className="flex-1 text-center text-sm font-semibold capitalize text-foreground">
                  {dayLabel(day)}
                </div>
                <button
                  onClick={() => setDay(addDaysStr(day, 1))}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
                  aria-label={t.next}
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
              <input
                type="date"
                value={day}
                min={today}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
              />

              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted">
                {t.pickNewTime}
              </p>

              {loading || slots === null ? (
                <p className="py-6 text-center text-sm text-muted">
                  {t.loadingSlots}
                </p>
              ) : slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  {t.noSlots}
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSelected(s.iso)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition",
                        selected === s.iso
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border text-foreground hover:border-gold/50",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {t.keepStaffNote}
              </p>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t.currentDuration}
                </span>
                <p className="text-foreground">
                  {minLabel(startMin)}–{minLabel(startMin + currentDuration)} ·{" "}
                  {formatDuration(currentDuration, locale)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() =>
                    setDuration((d) => Math.max(MIN_DURATION, d - STEP))
                  }
                  disabled={duration <= MIN_DURATION}
                  className="flex size-12 items-center justify-center rounded-full border border-border text-foreground hover:border-gold hover:text-gold disabled:opacity-30"
                  aria-label="-15"
                >
                  <Minus className="size-5" />
                </button>
                <div className="min-w-28 text-center">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {formatDuration(duration, locale)}
                  </p>
                </div>
                <button
                  onClick={() => setDuration((d) => d + STEP)}
                  className="flex size-12 items-center justify-center rounded-full border border-border text-foreground hover:border-gold hover:text-gold"
                  aria-label="+15"
                >
                  <Plus className="size-5" />
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gold">
                  {t.newEnd}
                </span>
                <p className="tabular-nums text-foreground">
                  {minLabel(startMin)}–{minLabel(newEndMin)}
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <button
            onClick={() => !pending && onClose()}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            {dd.cancel}
          </button>
          {tab === "move" ? (
            <button
              onClick={applyMove}
              disabled={pending || !selected}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
            >
              <Check className="size-4" />
              {pending ? dd.saving : t.apply}
            </button>
          ) : (
            <button
              onClick={applyDuration}
              disabled={pending || duration === currentDuration}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
            >
              <Check className="size-4" />
              {pending ? dd.saving : t.apply}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
