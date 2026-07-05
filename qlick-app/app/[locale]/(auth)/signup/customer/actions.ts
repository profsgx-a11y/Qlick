"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { isValidEmail, isValidPassword, isMobilePhone, normalizePhone } from "@/lib/validation";

export interface CustomerSignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // national digits or E.164, optional
  password: string;
}

export interface CustomerSignupResult {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

/**
 * Creates a customer account (account_type defaults to 'customer' via the
 * profiles trigger). Lands on /account on success.
 */
export async function createCustomerAccount(
  locale: string,
  payload: CustomerSignupPayload,
): Promise<CustomerSignupResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";

  if (!payload.firstName.trim()) {
    return { ok: false, error: "Συμπλήρωσε το όνομά σου." };
  }
  if (!payload.lastName.trim()) {
    return { ok: false, error: "Συμπλήρωσε το επίθετό σου." };
  }
  if (!isValidEmail(payload.email)) {
    return { ok: false, error: "Μη έγκυρο email." };
  }
  if (!isValidPassword(payload.password)) {
    return { ok: false, error: "Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες." };
  }

  // Mobile is required and must be a mobile number.
  if (!payload.phone.trim()) {
    return { ok: false, error: "Συμπλήρωσε κινητό τηλέφωνο." };
  }
  if (!isMobilePhone(payload.phone)) {
    return { ok: false, error: "Μη έγκυρος αριθμός κινητού." };
  }
  const normalizedPhone = normalizePhone(payload.phone);

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        preferred_language: safeLocale,
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already")) {
      return {
        ok: false,
        error:
          "Αυτό το email έχει ήδη λογαριασμό. Κάνε σύνδεση — μπορείς να κλείνεις ραντεβού από εκεί.",
      };
    }
    return { ok: false, error: signUpError.message };
  }
  if (!signUpData.user) {
    return { ok: false, error: "Δεν δημιουργήθηκε ο λογαριασμός." };
  }

  // Email confirmation required → no session yet (production with SMTP).
  if (!signUpData.session) {
    return { ok: true, needsEmailConfirmation: true };
  }

  // Save the phone on the profile so it pre-fills future bookings.
  if (normalizedPhone) {
    await supabase
      .from("profiles")
      .update({ phone: normalizedPhone })
      .eq("id", signUpData.user.id);
  }

  redirect(`/${safeLocale}/account`);
}
