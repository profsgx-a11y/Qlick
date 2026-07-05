import { parsePhoneNumberFromString } from "libphonenumber-js";
// `/max` metadata is required for getType() — the default (min) returns undefined.
import { parsePhoneNumberFromString as parsePhoneTyped } from "libphonenumber-js/max";
import type { CountryCode } from "libphonenumber-js";

// ── Email ────────────────────────────────────────────────────────
// Pragmatic RFC-5322-ish check: requires local@domain.tld with no spaces.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (value.length < 5 || value.length > 254) return false;
  return EMAIL_RE.test(value);
}

// ── Phone ────────────────────────────────────────────────────────
/**
 * Validates a phone number. `raw` may be national digits or E.164.
 * `country` is the default region when no + prefix is present.
 * Returns the E.164 string when valid, otherwise null.
 */
export function normalizePhone(
  raw: string,
  country: CountryCode = "GR",
): string | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, e.g. +306912345678
}

export function isValidPhone(
  raw: string,
  country: CountryCode = "GR",
): boolean {
  return normalizePhone(raw, country) !== null;
}

/**
 * Valid AND not a landline — used for the mandatory mobile field.
 * Accepts mobile / mobile-or-fixed / unknown types; rejects clear fixed lines.
 */
export function isMobilePhone(
  raw: string,
  country: CountryCode = "GR",
): boolean {
  const value = raw.trim();
  if (!value) return false;
  const parsed = parsePhoneTyped(value, country);
  if (!parsed || !parsed.isValid()) return false;
  return parsed.getType() !== "FIXED_LINE";
}

/**
 * Valid AND not a mobile — used for the optional landline field.
 * Accepts fixed-line / fixed-or-mobile / unknown types; rejects clear mobiles.
 */
export function isLandlinePhone(
  raw: string,
  country: CountryCode = "GR",
): boolean {
  const value = raw.trim();
  if (!value) return false;
  const parsed = parsePhoneTyped(value, country);
  if (!parsed || !parsed.isValid()) return false;
  return parsed.getType() !== "MOBILE";
}

export function formatPhoneAsYouType(): void {
  // placeholder kept for symmetry; AsYouType is used directly in the component
}

// ── Password ─────────────────────────────────────────────────────
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
