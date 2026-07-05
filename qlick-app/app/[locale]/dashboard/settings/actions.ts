"use server";

import { revalidatePath } from "next/cache";
import type { CountryCode } from "libphonenumber-js";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import {
  isMobilePhone,
  isLandlinePhone,
  isValidEmail,
  normalizePhone,
} from "@/lib/validation";
import type { Json } from "@/lib/supabase/types";

export interface BusinessInfoInput {
  name: string;
  mobileNational: string;
  mobileCountry: string;
  landlineNational: string;
  landlineCountry: string;
  street: string;
  city: string;
  area: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
  coverUrl: string | null;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
}

export interface SaveInfoResult {
  ok: boolean;
  error?: string;
}

/** Replaces the business's service categories. Owner/manager only. */
export async function saveBusinessCategories(
  locale: string,
  categoryIds: string[],
): Promise<SaveInfoResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, slug")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }

  const ids = Array.from(new Set(categoryIds.filter(Boolean)));
  if (ids.length === 0) {
    return { ok: false, error: "choose_category" };
  }

  // Replace the set: clear then insert the chosen categories.
  const { error: delErr } = await supabase
    .from("business_categories")
    .delete()
    .eq("business_id", biz.id);
  if (delErr) return { ok: false, error: "save_failed" };

  const { error: insErr } = await supabase
    .from("business_categories")
    .insert(ids.map((category_id) => ({ business_id: biz.id!, category_id })));
  if (insErr) return { ok: false, error: "save_failed" };

  // Keep the primary category_id in sync (first chosen).
  await supabase
    .from("businesses")
    .update({ category_id: ids[0] })
    .eq("id", biz.id);

  revalidatePath(`/${safeLocale}/dashboard/settings`);
  revalidatePath(`/${safeLocale}/dashboard`);
  const slug = (biz as { slug?: string }).slug;
  if (slug) revalidatePath(`/${safeLocale}/b/${slug}`);
  return { ok: true };
}

/** Updates the business name, phones and address. Owner/manager only. */
export async function saveBusinessInfo(
  locale: string,
  input: BusinessInfoInput,
): Promise<SaveInfoResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, slug")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "enter_business_name" };

  const ownerFirstName = input.ownerFirstName.trim();
  const ownerLastName = input.ownerLastName.trim();
  if (!ownerFirstName)
    return { ok: false, error: "enter_first_name" };
  if (!ownerLastName)
    return { ok: false, error: "enter_last_name" };

  const email = input.email.trim();
  if (!email) return { ok: false, error: "enter_business_email" };
  if (!isValidEmail(email)) return { ok: false, error: "invalid_email" };

  // Mobile is required and must be a mobile number.
  if (!input.mobileNational.trim())
    return { ok: false, error: "enter_mobile" };
  if (!isMobilePhone(input.mobileNational, input.mobileCountry as CountryCode))
    return { ok: false, error: "invalid_mobile" };
  const phone = normalizePhone(
    input.mobileNational,
    input.mobileCountry as CountryCode,
  );

  // Landline optional, but if given it must be a real landline (not a mobile).
  let landline: string | null = null;
  if (input.landlineNational.trim()) {
    if (
      !isLandlinePhone(input.landlineNational, input.landlineCountry as CountryCode)
    )
      return { ok: false, error: "invalid_landline" };
    landline = normalizePhone(
      input.landlineNational,
      input.landlineCountry as CountryCode,
    );
  }

  const street = input.street.trim();
  const city = input.city.trim();
  const area = input.area.trim();
  const postcode = input.postcode.trim();
  // Address is mandatory for businesses (street, city, postcode). Area optional.
  if (!city) return { ok: false, error: "enter_city" };
  if (!street) return { ok: false, error: "enter_street" };
  if (!postcode) return { ok: false, error: "enter_postcode" };
  const address = { street, city, area, postcode, lat: input.lat, lng: input.lng };

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      email,
      phone,
      landline,
      address: address as unknown as Json,
      logo_url: input.logoUrl?.trim() || null,
      cover_url: input.coverUrl?.trim() || null,
    })
    .eq("id", biz.id);
  if (error) return { ok: false, error: "save_failed" };

  // Owner's personal name (used when they book as a customer elsewhere).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ first_name: ownerFirstName, last_name: ownerLastName })
      .eq("id", user.id);
    await supabase.auth.updateUser({
      data: { first_name: ownerFirstName, last_name: ownerLastName },
    });
  }

  revalidatePath(`/${safeLocale}/dashboard/settings`);
  revalidatePath(`/${safeLocale}/dashboard`);
  const slug = (biz as { slug?: string }).slug;
  if (slug) revalidatePath(`/${safeLocale}/b/${slug}`);
  return { ok: true };
}

export interface DayHoursInput {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  open_time2: string | null;
  close_time2: string | null;
}

export interface SaveHoursResult {
  ok: boolean;
  error?: string;
}

/**
 * Replaces the business hours and saves the day display order.
 * `days` is in the desired display order.
 */
export async function saveHours(
  locale: string,
  days: DayHoursInput[],
): Promise<SaveHoursResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();

  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { ok: false, error: "no_permission" };
  }
  const businessId = biz.id;

  // Persist day display order
  const order = days.map((d) => d.day_of_week);
  const { error: orderErr } = await supabase
    .from("businesses")
    .update({ day_order: order as unknown as Json })
    .eq("id", businessId);
  if (orderErr) return { ok: false, error: "save_failed" };

  // Rebuild business_hours rows
  const rows: {
    business_id: string;
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
    order_index: number;
  }[] = [];

  for (const d of days) {
    if (d.is_closed) {
      rows.push({
        business_id: businessId,
        day_of_week: d.day_of_week,
        is_closed: true,
        open_time: null,
        close_time: null,
        order_index: 0,
      });
      continue;
    }
    if (d.open_time && d.close_time) {
      rows.push({
        business_id: businessId,
        day_of_week: d.day_of_week,
        is_closed: false,
        open_time: d.open_time,
        close_time: d.close_time,
        order_index: 0,
      });
    }
    if (d.open_time2 && d.close_time2) {
      rows.push({
        business_id: businessId,
        day_of_week: d.day_of_week,
        is_closed: false,
        open_time: d.open_time2,
        close_time: d.close_time2,
        order_index: 1,
      });
    }
  }

  const { error: delErr } = await supabase
    .from("business_hours")
    .delete()
    .eq("business_id", businessId);
  if (delErr) return { ok: false, error: "save_failed" };

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("business_hours").insert(rows);
    if (insErr) return { ok: false, error: "save_failed" };
  }

  revalidatePath(`/${safeLocale}/dashboard/settings`);
  revalidatePath(`/${safeLocale}/b/${(biz as { slug?: string }).slug ?? ""}`);
  return { ok: true };
}
