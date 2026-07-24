/**
 * Tiny cookie-consent store. "all" = allow non-essential third-party embeds
 * (currently only the Google Maps iframe on shop pages). "essential" = only
 * the cookies we need to run the site (auth/session). Persisted in
 * localStorage; a window event lets already-mounted components react to a
 * change without a reload.
 */
export type Consent = "all" | "essential";

const KEY = "qlick:cookie-consent";
export const CONSENT_EVENT = "qlick:consent-change";
export const REOPEN_EVENT = "qlick:consent-reopen";

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(c: Consent): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    // storage blocked (private mode) — the choice just won't persist
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

export function onConsentChange(cb: (c: Consent) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as Consent);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/** Re-open the consent bar so the visitor can change their choice. */
export function reopenConsent(): void {
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export function onConsentReopen(cb: () => void): () => void {
  window.addEventListener(REOPEN_EVENT, cb);
  return () => window.removeEventListener(REOPEN_EVENT, cb);
}
