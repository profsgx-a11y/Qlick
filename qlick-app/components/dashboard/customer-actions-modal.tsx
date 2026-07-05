"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Ban, X, Check, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { reportAccount, blockCustomer } from "@/app/[locale]/dashboard/reports/actions";

export interface CustomerRef {
  id: string;
  name: string;
  phone?: string | null;
}

export function CustomerActionsModal({
  locale,
  customer,
  onClose,
}: {
  locale: string;
  customer: CustomerRef;
  onClose: () => void;
}) {
  const router = useRouter();
  const dd = useDict().dashboard;
  const t = dd.report;
  const [view, setView] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submitReport = () =>
    start(async () => {
      setErr(null);
      const res = await reportAccount(locale, customer.id, customer.name, reason);
      if (!res.ok) setErr(dashErr(dd.errors, res.error, t.error));
      else setReported(true);
    });

  const doBlock = (cancelFuture: boolean) =>
    start(async () => {
      setErr(null);
      const res = await blockCustomer(locale, customer.id, cancelFuture);
      if (!res.ok) setErr(dashErr(dd.errors, res.error, t.error));
      else {
        onClose();
        router.refresh();
      }
    });

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-foreground">
              {customer.name}
            </h3>
            {customer.phone && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Phone className="size-3.5" />
                {customer.phone}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={dd.close}
            className="text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {err && (
          <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </p>
        )}

        {view === "menu" && (
          <div className="flex flex-col gap-2">
            {reported ? (
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-foreground">
                <Check className="size-4 text-gold" /> {t.sent}
              </p>
            ) : (
              <button
                onClick={() => setView("report")}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                <Flag className="size-4 text-gold" /> {t.reportAccount}
              </button>
            )}

            <p className="mt-1 text-xs font-medium text-muted-2">{t.block}</p>
            <p className="-mt-1 text-xs text-muted">{t.blockDesc}</p>
            <button
              onClick={() => doBlock(true)}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-3 py-2.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-40"
            >
              <Ban className="size-4" /> {t.blockCancel}
            </button>
            <button
              onClick={() => doBlock(false)}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-40"
            >
              {t.blockKeep}
            </button>
          </div>
        )}

        {view === "report" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.reportInfo}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={3}
              disabled={pending}
              className="block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
            />
            <div className="flex gap-2">
              <button
                onClick={submitReport}
                disabled={pending}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
              >
                {pending ? t.sending : t.sendReport}
              </button>
              <button
                onClick={() => setView("menu")}
                disabled={pending}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-muted",
                  "hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {dd.back}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
