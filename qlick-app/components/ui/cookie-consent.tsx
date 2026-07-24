"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { getConsent, setConsent, onConsentChange } from "@/lib/consent";

/**
 * Bottom cookie-consent bar. Shown until the visitor makes a choice; the
 * choice gates non-essential third-party embeds (the Google Map on shop
 * pages). Essential cookies (auth/session) always run.
 */
export function CookieConsent({ locale }: { locale: string }) {
  const t = useDict().cookie;
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only after mount — avoids an SSR/hydration flash and reads localStorage.
    if (getConsent() === null) setShow(true);
    // If the choice is made elsewhere (e.g. the map's "Show map" button),
    // dismiss the bar too.
    return onConsentChange(() => setShow(false));
  }, []);

  if (!show) return null;

  const choose = (c: "all" | "essential") => {
    setConsent(c);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-4">
        <Cookie className="hidden size-6 shrink-0 text-gold sm:block" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
          {t.text}{" "}
          <Link
            href={`/${locale}/privacy`}
            className="text-gold underline underline-offset-2 hover:text-gold-bright"
          >
            {t.more}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
          >
            {t.essential}
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
          >
            {t.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
