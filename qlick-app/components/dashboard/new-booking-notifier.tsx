"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, CalendarX, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDict } from "@/i18n/provider";

type ToastKind = "new" | "cancel";
type Toast = { id: string; kind: ToastKind; name: string; body: string };

// A single, discreet two-tone "ding" generated on the fly — no audio file.
let audioCtx: AudioContext | null = null;
function playBell() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    // two soft chimes a fourth apart
    for (const { f, t } of [
      { f: 880, t: 0 },
      { f: 1174.66, t: 0.11 },
    ]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.linearRampToValueAtTime(0.14, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.36);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.4);
    }
  } catch {
    /* audio not available — stay silent */
  }
}

/**
 * Listens (via Supabase Realtime) for new *online* bookings (source web/qr) on
 * this business and, for each one: plays a short bell, pops a toast, and
 * refreshes the calendar so the appointment appears immediately. Mounted only
 * on the calendar page.
 */
export function NewBookingNotifier({
  businessId,
  tz,
  locale,
}: {
  businessId: string;
  tz: string;
  locale: string;
}) {
  const router = useRouter();
  const dash = useDict().dashboard;
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const routerRef = React.useRef(router);
  routerRef.current = router;

  const dismiss = React.useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  React.useEffect(() => {
    const supabase = createClient();
    const fmt = new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      timeZone: tz,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    type BookingRow = {
      id: string;
      source: string | null;
      status: string | null;
      cancelled_by: string | null;
      starts_at: string;
      service_name: string | null;
      customer_name: string | null;
    };

    const pushToast = (kind: ToastKind, row: BookingRow) => {
      const parts = [
        row.service_name,
        row.starts_at ? fmt.format(new Date(row.starts_at)) : null,
      ].filter(Boolean) as string[];
      const toast: Toast = {
        id: `${row.id}-${kind}`,
        kind,
        name: row.customer_name ?? "",
        body: parts.join(" · "),
      };
      setToasts((prev) =>
        prev.some((t) => t.id === toast.id) ? prev : [...prev, toast],
      );
      playBell();
      routerRef.current.refresh();
      // Stay for a full minute unless the owner dismisses it with the X.
      window.setTimeout(() => dismiss(toast.id), 60000);
    };

    const handleInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as BookingRow;
      // Only bookings the customers made themselves (not dashboard walk-ins).
      if (row.source !== "web" && row.source !== "qr") return;
      pushToast("new", row);
    };

    const handleUpdate = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as BookingRow;
      // Only cancellations the customer performed themselves.
      if (row.status !== "cancelled" || row.cancelled_by !== "customer") return;
      pushToast("cancel", row);
    };

    const channel = supabase.channel(`bookings-notify-${businessId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bookings",
        filter: `business_id=eq.${businessId}`,
      },
      handleInsert,
    );
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `business_id=eq.${businessId}`,
      },
      handleUpdate,
    );

    let active = true;
    // Realtime honours RLS, so the socket needs the owner's JWT before we
    // subscribe — otherwise the postgres_changes stream is silently filtered.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[new-booking-notifier] realtime status:", status);
        }
      });
    });

    // Keep the socket token fresh across refreshes.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [businessId, tz, locale, dismiss]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const isCancel = t.kind === "cancel";
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.96 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className={
                "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface-2/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-md " +
                (isCancel
                  ? "border-danger/40"
                  : "border-gold/40 [box-shadow:var(--glow-nav)]")
              }
            >
              <span
                className={
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full " +
                  (isCancel
                    ? "bg-danger/15 text-danger"
                    : "bg-gold/15 text-gold")
                }
              >
                {isCancel ? (
                  <CalendarX className="size-4" strokeWidth={2} />
                ) : (
                  <CalendarCheck className="size-4" strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isCancel
                    ? dash.calendar.notifyCancelTitle
                    : dash.calendar.notifyTitle}
                </p>
                {t.name && (
                  <p className="truncate text-sm text-foreground">{t.name}</p>
                )}
                {t.body && (
                  <p className="mt-0.5 truncate text-xs text-muted">{t.body}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label={dash.calendar.notifyDismiss}
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-2 transition-colors hover:bg-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
