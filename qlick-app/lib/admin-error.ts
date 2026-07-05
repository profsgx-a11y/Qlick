import type { Dictionary } from "@/i18n/shared";

type AdminErrors = Dictionary["admin"]["errors"];

/**
 * Maps a stable error code raised by an admin server action / RPC to its
 * localized message; falls back to `fallback` for unknown codes.
 */
export function adminErr(
  errors: AdminErrors,
  code: string | undefined,
  fallback: string,
): string {
  if (code && code in errors) {
    return (errors as Record<string, string>)[code];
  }
  return fallback;
}
