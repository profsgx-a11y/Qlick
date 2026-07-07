"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/provider";
import {
  scheduleShopDeletion,
  cancelShopDeletion,
} from "./actions";

export function DeleteShop({
  locale,
  scheduledAt,
}: {
  locale: string;
  scheduledAt: string | null;
}) {
  const t = useDict().dashboard.settings;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fmtWhen = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  const doSchedule = () =>
    start(async () => {
      setErr(null);
      const res = await scheduleShopDeletion(locale);
      if (!res.ok) {
        setErr(t.saveFailed);
        return;
      }
      setConfirming(false);
      router.refresh();
    });

  const doCancel = () =>
    start(async () => {
      setErr(null);
      const res = await cancelShopDeletion(locale);
      if (!res.ok) {
        setErr(t.saveFailed);
        return;
      }
      router.refresh();
    });

  // Pending-deletion state: shop is offline, countdown running, cancellable.
  if (scheduledAt) {
    return (
      <section className="rounded-2xl border border-danger/40 bg-danger/5 p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t.deletionScheduledTitle}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {t.deletionScheduledBody.replace("{when}", fmtWhen(scheduledAt))}
            </p>
            {err && <p className="mt-3 text-sm text-danger">{err}</p>}
            <Button
              variant="secondary"
              onClick={doCancel}
              disabled={pending}
              className="mt-4"
            >
              <RotateCcw className="size-4" />
              {t.undoDeletion}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-danger/40 bg-danger/5 p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {t.dangerTitle}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
        {t.dangerDesc}
      </p>

      {!confirming ? (
        <Button
          variant="danger"
          onClick={() => {
            setErr(null);
            setConfirming(true);
          }}
          className="mt-4"
        >
          <Trash2 className="size-4" />
          {t.deleteShop}
        </Button>
      ) : (
        <div className="mt-4 rounded-xl border border-danger/40 bg-background p-4">
          <p className="text-sm font-semibold text-foreground">
            {t.deleteConfirmTitle}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {t.deleteConfirmBody}
          </p>
          {err && <p className="mt-3 text-sm text-danger">{err}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="danger" onClick={doSchedule} disabled={pending}>
              <Trash2 className="size-4" />
              {t.deleteConfirmCta}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              {t.cancelAction}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
