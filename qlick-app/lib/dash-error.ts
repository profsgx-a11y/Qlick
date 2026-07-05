import type { Dictionary } from "@/i18n/shared";

type DashErrors = Dictionary["dashboard"]["errors"];

/**
 * Maps a stable error code returned by a dashboard server action to its
 * localized message. Server actions return codes (e.g. "no_permission") instead
 * of hardcoded Greek strings; the client translates them via the active dict.
 * Falls back to `fallback` (already localized) for unknown/empty codes.
 */
export function dashErr(
  errors: DashErrors,
  code: string | undefined,
  fallback: string,
): string {
  if (code && code in errors) {
    return (errors as Record<string, string>)[code];
  }
  return fallback;
}
