"use client";

import Link from "next/link";
import { AlarmClock, OctagonAlert, ArrowRight } from "lucide-react";
import { useDict } from "@/i18n/provider";
import type { PlanState } from "@/lib/subscription";

/**
 * Dashboard-wide subscription notice:
 * - 5 days (or less) before the trial/subscription expires → amber reminder.
 * - After expiry → red notice: the shop stays fully accessible but customers
 *   see the "bookings paused" message until the plan is renewed.
 */
export function SubscriptionBanner({
  locale,
  state,
}: {
  locale: string;
  state: Pick<PlanState, "plan" | "active" | "daysLeft">;
}) {
  const t = useDict().dashboard.subscription;

  const expiringSoon =
    state.active && state.daysLeft !== null && state.daysLeft <= 5;
  if (state.active && !expiringSoon) return null;

  const what = state.plan === "free" ? t.trialWord : t.subWord;

  if (!state.active) {
    return (
      <div className="border-b border-danger/30 bg-danger/10 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start gap-3">
          <OctagonAlert className="mt-0.5 size-5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t.expiredTitle.replace("{what}", what)}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
              {t.expiredBody}
            </p>
          </div>
          <Link
            href={`/${locale}#pricing`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-medium text-black transition-colors hover:bg-gold-bright"
          >
            {t.renewCta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const when =
    state.daysLeft !== null && state.daysLeft <= 0
      ? t.today
      : state.daysLeft === 1
        ? t.tomorrow
        : t.inDays.replace("{n}", String(state.daysLeft));

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <AlarmClock className="size-5 shrink-0 text-warning" />
        <p className="min-w-0 flex-1 text-sm text-foreground">
          <span className="font-semibold">
            {t.soonTitle.replace("{what}", what).replace("{when}", when)}
          </span>{" "}
          <span className="text-muted">{t.soonBody}</span>
        </p>
        <Link
          href={`/${locale}#pricing`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-warning/50 px-4 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
        >
          {t.renewCta}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
