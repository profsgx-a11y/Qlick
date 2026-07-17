"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { isMobilePhone, normalizePhone, isValidPassword } from "@/lib/validation";
import { queueGcalSync } from "@/lib/google/sync";

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

/** Customer cancels their own upcoming booking. */
export async function cancelBooking(
  locale: string,
  bookingId: string,
): Promise<SimpleResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
  });
  if (error) {
    // Stable codes; the client maps them to the active locale.
    if ((error.message || "").includes("cannot_cancel"))
      return { ok: false, error: "cannot_cancel" };
    return { ok: false, error: "cancel_failed" };
  }
  queueGcalSync([bookingId]);
  revalidatePath(`/${safeLocale}/account`);
  return { ok: true };
}

/** Customer reschedules their own booking (same service + staff preference). */
export async function rescheduleBooking(
  locale: string,
  bookingId: string,
  startsAtIso: string,
  staffId: string | null,
): Promise<SimpleResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_starts_at: startsAtIso,
    p_staff_id: staffId ?? undefined,
  });
  if (error) {
    const m = error.message || "";
    // Stable codes; the client maps them to the active locale.
    if (m.includes("slot_taken")) return { ok: false, error: "slot_taken" };
    if (m.includes("slot_in_past")) return { ok: false, error: "slot_in_past" };
    if (m.includes("customer_time_conflict"))
      return { ok: false, error: "customer_busy" };
    if (m.includes("cannot_modify")) return { ok: false, error: "cannot_modify" };
    if (m.includes("service_not_available"))
      return { ok: false, error: "service_unavailable" };
    return { ok: false, error: "reschedule_failed" };
  }
  queueGcalSync([bookingId]);
  revalidatePath(`/${safeLocale}/account`);
  return { ok: true };
}

/**
 * Updates the customer's name, mobile (required) and optional home address
 * (city/street/postcode + lat/lng — used to show distances to businesses).
 */
export async function updateProfile(
  locale: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    city?: string;
    street?: string;
    postcode?: string;
    lat?: number | null;
    lng?: number | null;
  },
): Promise<SimpleResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) return { ok: false, error: "enter_first_name" };
  if (!lastName) return { ok: false, error: "enter_last_name" };

  // Mobile is required and must be a mobile number.
  if (!input.phone.trim()) {
    return { ok: false, error: "enter_mobile" };
  }
  if (!isMobilePhone(input.phone)) {
    return { ok: false, error: "invalid_mobile" };
  }
  const phone = normalizePhone(input.phone);

  // Address is optional; store it only when there's something meaningful.
  const city = (input.city ?? "").trim();
  const street = (input.street ?? "").trim();
  const postcode = (input.postcode ?? "").trim();
  const hasAddress = !!(city || street || input.lat != null);
  const address = hasAddress
    ? {
        city,
        street,
        postcode,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      }
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "save_failed" };

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, phone, address })
    .eq("id", user.id);
  if (error) return { ok: false, error: "save_failed" };

  // Keep the auth metadata name in sync (used as a fallback elsewhere).
  await supabase.auth.updateUser({
    data: { first_name: firstName, last_name: lastName },
  });

  revalidatePath(`/${safeLocale}/account/profile`);
  revalidatePath(`/${safeLocale}/account`);
  return { ok: true };
}

/**
 * Changes the signed-in user's password. The current password is required and
 * verified (re-auth) first, so a hijacked open session can't silently reset it.
 * Returns stable codes; the client maps them to the active locale.
 */
export async function changePassword(
  _locale: string,
  currentPassword: string,
  newPassword: string,
): Promise<SimpleResult> {
  if (!currentPassword.trim()) {
    return { ok: false, error: "enter_current_password" };
  }
  if (!isValidPassword(newPassword)) {
    return { ok: false, error: "weak_password" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "change_failed" };

  // Verify the current password by re-authenticating with it.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { ok: false, error: "wrong_current_password" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: "change_failed" };
  return { ok: true };
}

/** Adds/removes a business from the customer's favorites. Returns new state. */
export async function toggleFavorite(
  locale: string,
  businessId: string,
): Promise<{ ok: boolean; favorited?: boolean; error?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("business_id")
    .eq("customer_id", user.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("customer_id", user.id)
      .eq("business_id", businessId);
    if (error) return { ok: false, error: "Κάτι πήγε στραβά." };
    revalidatePath(`/${safeLocale}/account/favorites`);
    return { ok: true, favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ customer_id: user.id, business_id: businessId });
  if (error) return { ok: false, error: "Κάτι πήγε στραβά." };
  revalidatePath(`/${safeLocale}/account/favorites`);
  return { ok: true, favorited: true };
}

export interface ReviewResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// Stable review error codes; the client maps them to the active locale via
// lib/review-error.ts (server never returns locale-specific strings).
const REVIEW_CODES = [
  "not_authenticated",
  "invalid_rating",
  "booking_not_found",
  "booking_not_completed",
  "review_window_closed",
  "already_reviewed",
  "review_not_found",
];

function reviewCode(message: string): string {
  return REVIEW_CODES.find((c) => message.includes(c)) ?? "generic";
}

export type NameVisibility = "full" | "first" | "anonymous";

export async function createReview(
  locale: string,
  bookingId: string,
  rating: number,
  comment: string,
  nameVisibility: NameVisibility = "full",
): Promise<ReviewResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  if (rating < 1 || rating > 5)
    return { ok: false, error: "invalid_rating" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_review", {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
    p_name_visibility: nameVisibility,
  });

  if (error) return { ok: false, error: reviewCode(error.message) };

  revalidatePath(`/${safeLocale}/account`);
  return { ok: true, id: data as string };
}

export async function updateReview(
  locale: string,
  reviewId: string,
  rating: number,
  comment: string,
  nameVisibility: NameVisibility = "full",
): Promise<ReviewResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  if (rating < 1 || rating > 5)
    return { ok: false, error: "invalid_rating" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_review", {
    p_review_id: reviewId,
    p_rating: rating,
    p_comment: comment,
    p_name_visibility: nameVisibility,
  });

  if (error) return { ok: false, error: reviewCode(error.message) };

  revalidatePath(`/${safeLocale}/account`);
  return { ok: true };
}
