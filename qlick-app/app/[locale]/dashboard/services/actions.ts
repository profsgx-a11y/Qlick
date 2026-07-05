"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { FREE_LIMITS, getPlanState } from "@/lib/subscription";

export interface ServiceInput {
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string;
  isActive: boolean;
}

export interface ServiceActionResult {
  ok: boolean;
  error?: string;
}

async function getOwnerBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!data?.id) return null;
  if (data.my_role !== "owner" && data.my_role !== "manager") return null;
  return data.id;
}

function validate(input: ServiceInput): string | null {
  if (!input.name.trim()) return "enter_service_name";
  if (input.durationMinutes <= 0) return "duration_positive";
  if (input.priceCents < 0) return "invalid_price";
  return null;
}

export async function createService(
  locale: string,
  input: ServiceInput,
): Promise<ServiceActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const businessId = await getOwnerBusinessId(supabase);
  if (!businessId) return { ok: false, error: "business_not_found" };

  // Free plan: up to FREE_LIMITS.services active services.
  const plan = await getPlanState(supabase, businessId);
  if (plan.plan === "free") {
    const { count } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_active", true);
    if ((count ?? 0) >= FREE_LIMITS.services) {
      return { ok: false, error: "service_limit_free" };
    }
  }

  const { error } = await supabase.from("services").insert({
    business_id: businessId,
    name: input.name.trim(),
    description: input.description.trim() || null,
    duration_minutes: input.durationMinutes,
    price_cents: input.priceCents,
    is_active: input.isActive,
  });

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/services`);
  revalidatePath(`/${safeLocale}/dashboard`);
  return { ok: true };
}

export async function updateService(
  locale: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ServiceActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      duration_minutes: input.durationMinutes,
      price_cents: input.priceCents,
      is_active: input.isActive,
    })
    .eq("id", serviceId);

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/services`);
  return { ok: true };
}

export async function toggleService(
  locale: string,
  serviceId: string,
  isActive: boolean,
): Promise<ServiceActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId);

  if (error) return { ok: false, error: "save_failed" };
  revalidatePath(`/${safeLocale}/dashboard/services`);
  return { ok: true };
}

export async function deleteService(
  locale: string,
  serviceId: string,
): Promise<ServiceActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", serviceId);

  if (error) return { ok: false, error: "save_failed" };
  revalidatePath(`/${safeLocale}/dashboard/services`);
  revalidatePath(`/${safeLocale}/dashboard`);
  return { ok: true };
}
