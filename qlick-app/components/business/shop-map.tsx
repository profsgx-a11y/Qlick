"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getConsent, setConsent, onConsentChange } from "@/lib/consent";

/**
 * Location section for a shop page. The Google Map iframe loads only after the
 * visitor accepts cookies (it sets Google cookies + sends their IP); until
 * then we show a placeholder with a load button and an "Open in Maps" link
 * that works without loading anything.
 */
export function ShopMap({
  embedSrc,
  mapsLink,
  addressLine,
  labels,
}: {
  embedSrc: string;
  mapsLink: string | null;
  addressLine: string;
  labels: {
    title: string;
    openInMaps: string;
    consentPrompt: string;
    consentLoad: string;
  };
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(getConsent() === "all");
    return onConsentChange((c) => setAllowed(c === "all"));
  }, []);

  return (
    <section className="border-t border-border py-12">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {labels.title}
          </h2>
          {addressLine && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-4 text-gold" />
              {addressLine}
            </p>
          )}
        </div>
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-gold-soft"
          >
            <MapPin className="size-4 text-gold" />
            {labels.openInMaps}
          </a>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border elev-card">
        {allowed ? (
          <iframe
            title={labels.title}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="block h-[340px] w-full border-0 sm:h-[400px]"
          />
        ) : (
          <div className="flex h-[340px] w-full flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center sm:h-[400px]">
            <MapPin className="size-8 text-muted-2" />
            <p className="max-w-sm text-sm text-muted">{labels.consentPrompt}</p>
            <button
              type="button"
              onClick={() => setConsent("all")}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
            >
              {labels.consentLoad}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
