"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  X,
  CheckCircle2,
  UserX,
  CalendarOff,
  ClipboardCheck,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { updateBookingStatus } from "@/app/[locale]/dashboard/bookings/actions";

export interface PastDueBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string | null;
  customerPhone: string | null;
  serviceName: string | null;
}

/**
 * Auto-opening reminder for past appointments still awaiting an outcome
 * (pending/confirmed but already ended). Mounted in the dashboard layout so it
 * shows on every dashboard page. The owner marks each one Completed / No-show /
 * Cancelled; resolved rows leave the list. "Later" closes it, leaving a badge.
 */
export function PastDueReminder({
  locale,
  tz,
  initial,
}: {
  locale: string;
  tz: string;
  initial: PastDueBooking[];
}) {
  const t = useDict().dashboard.pastDue;
  const dd = useDict().dashboard;
  const router = useRouter();
  const [list, setList] = useState<PastDueBooking[]>(initial);
  const [open, setOpen] = useState(initial.length > 0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Nothing left to do and the panel is closed → render nothing.
  if (list.length === 0 && !open) return null;

  const loc = locale === "el" ? "el-GR" : "en-GB";
  const dateFmt = new Intl.DateTimeFormat(loc, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  });
  const timeFmt = new Intl.DateTimeFormat(loc, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
  const when = (b: PastDueBooking) =>
    `${dateFmt.format(new Date(b.startsAt))} · ${timeFmt.format(
      new Date(b.startsAt),
    )}–${timeFmt.format(new Date(b.endsAt))}`;

  const mark = (id: string, status: "completed" | "no_show" | "cancelled") => {
    const removed = list.find((b) => b.id === id);
    setError(null);
    setPendingId(id);
    setList((prev) => prev.filter((b) => b.id !== id)); // optimistic
    startTransition(async () => {
      const res = await updateBookingStatus(locale, id, status);
      setPendingId(null);
      if (!res.ok && removed) {
        // Put it back and surface the (translated) error.
        setList((prev) =>
          [removed, ...prev].sort((a, b) =>
            b.startsAt.localeCompare(a.startsAt),
          ),
        );
        setError(dashErr(dd.errors, res.error, dd.genericError));
      } else {
        router.refresh(); // keep calendar/reports/counts in sync
      }
    });
  };

  const actions: {
    status: "completed" | "no_show" | "cancelled";
    label: string;
    Icon: typeof CheckCircle2;
    cls: string;
  }[] = [
    {
      status: "completed",
      label: t.completed,
      Icon: CheckCircle2,
      cls: "text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-400/10",
    },
    {
      status: "no_show",
      label: t.noShow,
      Icon: UserX,
      cls: "text-amber-400 hover:border-amber-400/60 hover:bg-amber-400/10",
    },
    {
      status: "cancelled",
      label: t.cancelled,
      Icon: CalendarOff,
      cls: "text-red-400 hover:border-red-400/60 hover:bg-red-400/10",
    },
  ];

  return (
    <>
      {/* Floating badge to reopen after "Later" */}
      {!open && list.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-surface px-4 py-2.5 text-sm font-medium text-gold shadow-2xl shadow-black/50 transition-colors hover:bg-gold/10"
        >
          <ClipboardCheck className="size-4" />
          {t.badge.replace("{n}", String(list.length))}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <ClipboardCheck className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {t.title}
                  </h2>
                  <p className="text-sm text-muted">{t.intro}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label={dd.close}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <PartyPopper className="size-8 text-gold" />
                <p className="font-semibold text-foreground">{t.allDone}</p>
                <p className="text-sm text-muted">{t.allDoneHint}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {error && (
                  <p className="mb-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <ul className="space-y-3">
                  {list.map((b) => (
                    <li
                      key={b.id}
                      className={cn(
                        "rounded-xl border border-border bg-surface-2/40 p-3",
                        pendingId === b.id && "opacity-50",
                      )}
                    >
                      <p className="text-xs font-medium tabular-nums text-gold">
                        {when(b)}
                      </p>
                      {b.customerName && (
                        <p className="mt-0.5 font-medium text-foreground">
                          {b.customerName}
                        </p>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                        {b.serviceName && <span>{b.serviceName}</span>}
                        {b.customerPhone && (
                          <a
                            href={`tel:${b.customerPhone.replace(/\s+/g, "")}`}
                            className="inline-flex items-center gap-1 text-gold hover:underline"
                          >
                            <Phone className="size-3.5" />
                            {b.customerPhone}
                          </a>
                        )}
                      </div>
                      <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {actions.map(({ status, label, Icon, cls }) => (
                          <button
                            key={status}
                            onClick={() => mark(b.id, status)}
                            disabled={pendingId === b.id}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-40",
                              cls,
                            )}
                          >
                            <Icon className="size-3.5 shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border p-3">
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                {list.length === 0 ? dd.close : t.later}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
