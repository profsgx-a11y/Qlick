"use client";

import { reopenConsent } from "@/lib/consent";

/** Footer link that re-opens the cookie consent bar to change the choice. */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={reopenConsent}
      className="text-muted-2 underline-offset-2 transition-colors hover:text-foreground hover:underline"
    >
      {label}
    </button>
  );
}
