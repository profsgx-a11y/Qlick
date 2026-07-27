import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns `url` only if it is safe to put in an href, otherwise null.
 *
 * Business links (website / social) are free text a shop owner controls, and
 * they surface in the admin panel — a `javascript:` or `data:` href would run
 * in an admin's session on a single click. Only http(s) is ever linkable.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  try {
    // Bare domains ("qlick.gr") are common in these fields — assume https.
    const parsed = new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) ? value : `https://${value}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
