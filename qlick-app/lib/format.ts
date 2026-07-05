/** Money + duration formatting helpers (EUR / minutes). */

export function eurosToCents(euros: string | number): number {
  const n = typeof euros === "string" ? parseFloat(euros.replace(",", ".")) : euros;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatPrice(cents: number, locale = "el"): string {
  return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatDateTime(
  iso: string,
  timeZone = "Europe/Athens",
  locale = "el",
): string {
  return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatTimeRange(
  startIso: string,
  endIso: string,
  timeZone = "Europe/Athens",
  locale = "el",
): string {
  const t = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return `${t(startIso)}–${t(endIso)}`;
}

export function formatDuration(minutes: number, locale = "el"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hLabel = locale === "el" ? "ώ" : "h";
  const mLabel = locale === "el" ? "λ" : "min";
  if (h && m) return `${h}${hLabel} ${m}${mLabel}`;
  if (h) return `${h}${hLabel}`;
  return `${m}${mLabel}`;
}
