"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { slugify } from "@/lib/slug";
import {
  isValidEmail,
  isValidPassword,
  isMobilePhone,
  isLandlinePhone,
  normalizePhone,
} from "@/lib/validation";

export interface SignupPayload {
  // Account fields — omitted/ignored when the user is already authenticated
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // Business fields
  businessEmail: string; // contact email (used in the authenticated path)
  businessName: string;
  categoryIds: string[];
  phone: string; // mobile, E.164 or empty
  landline: string; // landline, E.164 or empty
  city: string;
  area: string;
  address: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  hours: Array<{
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
    open_time2?: string | null;
    close_time2?: string | null;
  }>;
}

export interface SignupResult {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface EmailCheckResult {
  validFormat: boolean;
  available: boolean;
}

/**
 * Checks whether an email is well-formed and not already registered.
 * Called from the account step so the user finds out early — before
 * filling in business details. Fails open on errors (the final submit
 * still rejects duplicates).
 */
export async function checkEmailAvailable(
  email: string,
): Promise<EmailCheckResult> {
  if (!isValidEmail(email)) return { validFormat: false, available: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("email_available", {
    p_email: email.trim(),
  });
  if (error) return { validFormat: true, available: true };
  return { validFormat: true, available: data === true };
}

export async function createAccountAndBusiness(
  locale: string,
  payload: SignupPayload,
): Promise<SignupResult> {
  const supabase = await createClient();
  const safeLocale = hasLocale(locale) ? locale : "el";

  // ── 0. Is the user already signed in (e.g. via OAuth)? ───────
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  // Guard: an authenticated user who already owns a business must not create a
  // second one through the wizard (that left orphan draft businesses that hid
  // the real one in the dashboard). Send them to their dashboard instead.
  if (existingUser) {
    const { data: owned } = await supabase
      .from("my_businesses")
      .select("id")
      .limit(1);
    if ((owned?.length ?? 0) > 0) {
      redirect(`/${safeLocale}/dashboard`);
    }
  }

  // ── 1. Validate business fields (always required) ────────────
  if (!payload.businessName.trim()) {
    return { ok: false, error: "Συμπλήρωσε το όνομα του καταστήματος." };
  }
  const categoryIds = Array.from(new Set(payload.categoryIds.filter(Boolean)));
  if (categoryIds.length === 0) {
    return { ok: false, error: "Διάλεξε τουλάχιστον ένα είδος υπηρεσίας." };
  }

  // Mobile is required and must be a mobile number.
  if (!payload.phone.trim()) {
    return { ok: false, error: "Συμπλήρωσε κινητό τηλέφωνο." };
  }
  if (!isMobilePhone(payload.phone)) {
    return { ok: false, error: "Μη έγκυρος αριθμός κινητού." };
  }
  const normalizedPhone = normalizePhone(payload.phone);

  // Landline optional, but if given it must be a landline (not a mobile).
  let normalizedLandline: string | null = null;
  if (payload.landline.trim()) {
    if (!isLandlinePhone(payload.landline)) {
      return { ok: false, error: "Μη έγκυρος αριθμός σταθερού." };
    }
    normalizedLandline = normalizePhone(payload.landline);
  }

  // Address is mandatory for businesses (street, city, postcode). Area optional.
  if (!payload.address.trim())
    return { ok: false, error: "Συμπλήρωσε τη διεύθυνση." };
  if (!payload.city.trim())
    return { ok: false, error: "Συμπλήρωσε την πόλη." };
  if (!payload.postcode.trim())
    return { ok: false, error: "Συμπλήρωσε τον Τ.Κ." };

  // Authenticated path skips the account step → require the contact email here.
  if (existingUser && !isValidEmail(payload.businessEmail))
    return { ok: false, error: "Συμπλήρωσε έγκυρο email καταστήματος." };

  let userId: string;

  if (existingUser) {
    // ── 2a. Already authenticated — reuse the account ──────────
    userId = existingUser.id;
  } else {
    // ── 2b. Validate account fields ────────────────────────────
    if (!isValidEmail(payload.email)) {
      return { ok: false, error: "Μη έγκυρο email." };
    }
    if (!isValidPassword(payload.password)) {
      return { ok: false, error: "Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες." };
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        // The confirmation link must land on the auth callback, which exchanges
        // the code for a session and forwards home — not the bare site root.
        emailRedirectTo: `${site}/${safeLocale}/auth/callback`,
        data: {
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          preferred_language: safeLocale,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already")) {
        return { ok: false, error: "Αυτό το email χρησιμοποιείται ήδη." };
      }
      return { ok: false, error: signUpError.message };
    }
    if (!signUpData.user) {
      return { ok: false, error: "Δεν δημιουργήθηκε ο λογαριασμός." };
    }

    // Email confirmation required → no session yet
    if (!signUpData.session) {
      return { ok: true, needsEmailConfirmation: true };
    }
    userId = signUpData.user.id;
  }

  // ── 3. Create business + owner + hours atomically (RPC) ──────
  void userId; // ownership is derived from auth.uid() inside the RPC

  const address = {
    city: payload.city.trim(),
    area: payload.area.trim(),
    street: payload.address.trim(),
    postcode: payload.postcode.trim(),
    lat: payload.lat,
    lng: payload.lng,
  };

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_business_with_owner",
    {
      p_name: payload.businessName.trim(),
      p_slug: slugify(payload.businessName),
      p_category_id: categoryIds[0], // primary category
      p_phone: normalizedPhone ?? "", // "" is converted to NULL inside the RPC
      p_landline: normalizedLandline ?? "",
      p_address: address,
      p_hours: payload.hours,
    },
  );

  if (rpcError) {
    if (rpcError.message.includes("not_authenticated")) {
      return {
        ok: false,
        error: "Η σύνδεση έληξε. Κάνε ξανά σύνδεση και δοκίμασε.",
      };
    }
    // Already owns a business (app guard was bypassed) → send to the dashboard.
    if (rpcError.message.includes("already_owns_business")) {
      redirect(`/${safeLocale}/dashboard`);
    }
    // Anti-fake-account: the email must be confirmed before creating a shop.
    if (rpcError.message.includes("email_not_confirmed")) {
      return {
        ok: false,
        error:
          safeLocale === "el"
            ? "Επιβεβαίωσε πρώτα το email σου (σου έχουμε στείλει email επιβεβαίωσης) και μετά ολοκλήρωσε την εγγραφή του καταστήματος."
            : "Confirm your email first (we've sent you a confirmation email), then finish setting up your shop.",
      };
    }
    return {
      ok: false,
      error: rpcError.message ?? "Δεν δημιουργήθηκε το κατάστημα.",
    };
  }

  // Save ALL chosen categories (many-to-many) so the business shows up in
  // search for each of them. (The RPC only sets the primary category_id.)
  const newBusinessId = (rpcData as { business_id: string }[] | null)?.[0]
    ?.business_id;
  if (newBusinessId) {
    await supabase
      .from("business_categories")
      .insert(
        categoryIds.map((category_id) => ({
          business_id: newBusinessId,
          category_id,
        })),
      );

    // Store the contact email: the edited business email when authenticated
    // (account step skipped), otherwise the signup/account email.
    const ownerEmail = (
      existingUser
        ? payload.businessEmail.trim() || existingUser.email || ""
        : payload.email
    ).trim();
    if (ownerEmail) {
      await supabase
        .from("businesses")
        .update({ email: ownerEmail })
        .eq("id", newBusinessId);
    }
  }

  // ── 4. Save the owner's personal name on the profile ─────────
  // (Set via signUp metadata for new accounts; ensures it for existing/OAuth too.)
  const ownerFirst = payload.firstName.trim();
  const ownerLast = payload.lastName.trim();
  if (ownerFirst || ownerLast) {
    await supabase
      .from("profiles")
      .update({ first_name: ownerFirst, last_name: ownerLast })
      .eq("id", userId);
    await supabase.auth.updateUser({
      data: { first_name: ownerFirst, last_name: ownerLast },
    });
  }

  // ── 5. Done ──────────────────────────────────────────────────
  redirect(`/${safeLocale}/dashboard?welcome=1`);
}
