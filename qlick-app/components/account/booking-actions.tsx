"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { getAvailableSlots } from "@/app/[locale]/b/[slug]/book/actions";
import { cancelBooking, rescheduleBooking } from "@/app/[locale]/account/actions";

interface Slot {
  iso: string;
  label: string;
}

interface BookingActionsProps {
  locale: string;
  bookingId: string;
  businessId: string;
  serviceId: string | null;
  staffId: string | null;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function BookingActions({
  locale,
  bookingId,
  businessId,
  serviceId,
  staffId,
}: BookingActionsProps) {
  const router = useRouter();
  const dict = useDict();
  const a = dict.account;
  const b = dict.booking;
  const rescheduleErr = (code: string | undefined) =>
    code === "slot_taken"
      ? b.slotTaken
      : code === "slot_in_past"
        ? b.slotInPast
        : code === "cannot_modify"
          ? a.errCannotModify
          : code === "service_unavailable"
            ? b.serviceUnavailable
            : code === "customer_busy"
              ? b.customerBusy
              : a.errRescheduleFailed;
  const [mode, setMode] = useState<null | "reschedule" | "cancel">(null);
  const [date, setDate] = useState(todayIso());
  const [cur, setCur] = useState(() => {
    const [y, m] = todayIso().split("-").map(Number);
    return { y, m };
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fetch slots whenever the reschedule modal is open and the date changes.
  useEffect(() => {
    if (mode !== "reschedule" || !serviceId) return;
    let active = true;
    setLoadingSlots(true);
    getAvailableSlots(businessId, serviceId, date, staffId).then((res) => {
      if (!active) return;
      setSlots(res.slots ?? []);
      setLoadingSlots(false);
    });
    return () => {
      active = false;
    };
  }, [mode, date, businessId, serviceId, staffId]);

  const tIso = todayIso();
  const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
  const firstWeekday = (new Date(cur.y, cur.m - 1, 1).getDay() + 6) % 7;
  const atCurrentMonth = (() => {
    const [y, m] = tIso.split("-").map(Number);
    return cur.y === y && cur.m === m;
  })();
  const prevMonth = () =>
    setCur((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { ...c, m: c.m - 1 }));
  const nextMonth = () =>
    setCur((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { ...c, m: c.m + 1 }));

  const openReschedule = () => {
    setErr(null);
    setDate(todayIso());
    const [y, m] = todayIso().split("-").map(Number);
    setCur({ y, m });
    setSlots([]);
    setMode("reschedule");
  };

  const pickSlot = (s: Slot) => {
    setErr(null);
    startTransition(async () => {
      const res = await rescheduleBooking(locale, bookingId, s.iso, staffId);
      if (!res.ok) {
        setErr(rescheduleErr(res.error));
        // Availability may have changed (e.g. someone just took the slot) —
        // reload this day's slots so the list reflects what's still free.
        if (serviceId) {
          setLoadingSlots(true);
          const fresh = await getAvailableSlots(
            businessId,
            serviceId,
            date,
            staffId,
          );
          setSlots(fresh.slots ?? []);
          setLoadingSlots(false);
        }
        return;
      }
      setMode(null);
      router.refresh();
    });
  };

  const confirmCancel = () => {
    setErr(null);
    startTransition(async () => {
      const res = await cancelBooking(locale, bookingId);
      if (!res.ok) {
        setErr(res.error === "cannot_cancel" ? a.errCannotCancel : a.errCancelFailed);
        return;
      }
      setMode(null);
      router.refresh();
    });
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
      <button
        onClick={openReschedule}
        disabled={!serviceId}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
      >
        <CalendarClock className="size-4" />
        {a.changeDateTime}
      </button>
      <button
        onClick={() => {
          setErr(null);
          setMode("cancel");
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      >
        <XCircle className="size-4" />
        {a.cancelAction}
      </button>

      {/* Cancel confirm */}
      {mode === "cancel" && (
        <Overlay onClose={() => !pending && setMode(null)}>
          <h3 className="font-display text-base font-bold text-foreground">
            {a.cancelTitle}
          </h3>
          <p className="mt-1 text-sm text-muted">{a.cancelBody}</p>
          {err && (
            <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {err}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={confirmCancel}
              disabled={pending}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-40"
            >
              {pending ? a.cancelling : a.yesCancel}
            </button>
            <button
              onClick={() => setMode(null)}
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              {a.no}
            </button>
          </div>
        </Overlay>
      )}

      {/* Reschedule */}
      {mode === "reschedule" && (
        <Overlay onClose={() => !pending && setMode(null)} wide>
          <div className="mb-3 flex items-start justify-between">
            <h3 className="font-display text-base font-bold text-foreground">
              {a.changeDateTime}
            </h3>
            <button
              onClick={() => setMode(null)}
              className="text-muted hover:text-foreground"
              aria-label={a.close}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Calendar */}
          <div className="mx-auto max-w-xs rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                disabled={atCurrentMonth}
                aria-label={b.prevMonth}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted enabled:hover:bg-surface-2 enabled:hover:text-foreground disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold capitalize text-foreground">
                {b.monthsShort[cur.m - 1]} {cur.y}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label={b.nextMonth}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
              {b.calWeekdays.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dnum = i + 1;
                const iso = `${cur.y}-${String(cur.m).padStart(2, "0")}-${String(
                  dnum,
                ).padStart(2, "0")}`;
                const past = iso < tIso;
                const selected = iso === date;
                const isToday = iso === tIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={past}
                    onClick={() => {
                      setErr(null);
                      setDate(iso);
                    }}
                    className={cn(
                      "grid aspect-square place-items-center rounded-lg text-sm transition-colors",
                      past && "text-muted-2 opacity-40",
                      !past && !selected && "text-foreground hover:bg-gold/10",
                      selected && "bg-gold font-bold text-black",
                      !selected && isToday && "ring-1 ring-gold",
                    )}
                  >
                    {dnum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div className="mx-auto mt-5 max-w-md text-center">
            {err && (
              <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {err}
              </p>
            )}
            {loadingSlots ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> {b.loadingTimes}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">{b.noTimes}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.iso}
                    onClick={() => pickSlot(s)}
                    disabled={pending}
                    className="rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold disabled:opacity-40"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl",
          wide ? "max-w-md" : "max-w-sm",
        )}
      >
        {children}
      </div>
    </>
  );
}
