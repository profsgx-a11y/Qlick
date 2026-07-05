"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { FREE_LIMITS, getPlanState } from "@/lib/subscription";

export interface StaffInput {
  name: string;
  title: string;
  color: string;
  avatarUrl: string;
  isBookable: boolean;
  serviceIds: string[];
}

export interface StaffActionResult {
  ok: boolean;
  error?: string;
  id?: string;
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

function validate(input: StaffInput): string | null {
  if (!input.name.trim()) return "enter_person_name";
  return null;
}

/** Replace the service_staff rows for a staff member. */
async function syncServices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string,
  serviceIds: string[],
): Promise<string | null> {
  const { error: delErr } = await supabase
    .from("service_staff")
    .delete()
    .eq("staff_id", staffId);
  if (delErr) return "save_failed";

  if (serviceIds.length === 0) return null;

  const { error: insErr } = await supabase
    .from("service_staff")
    .insert(serviceIds.map((service_id) => ({ service_id, staff_id: staffId })));
  if (insErr) return "save_failed";
  return null;
}

export async function createStaff(
  locale: string,
  input: StaffInput,
): Promise<StaffActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const businessId = await getOwnerBusinessId(supabase);
  if (!businessId) return { ok: false, error: "business_not_found" };

  // Free plan: up to FREE_LIMITS.staff active staff members.
  const plan = await getPlanState(supabase, businessId);
  if (plan.plan === "free") {
    const { count } = await supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_active", true);
    if ((count ?? 0) >= FREE_LIMITS.staff) {
      return { ok: false, error: "staff_limit_free" };
    }
  }

  // Place new staff at the end.
  const { data: last } = await supabase
    .from("staff")
    .select("order_index")
    .eq("business_id", businessId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orderIndex = (last?.order_index ?? -1) + 1;

  const { data: created, error } = await supabase
    .from("staff")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      title: input.title.trim() || null,
      color: input.color || null,
      avatar_url: input.avatarUrl.trim() || null,
      is_bookable: input.isBookable,
      order_index: orderIndex,
    })
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: "save_failed" };

  const svcErr = await syncServices(supabase, created.id, input.serviceIds);
  if (svcErr) return { ok: false, error: svcErr };

  revalidatePath(`/${safeLocale}/dashboard/staff`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true, id: created.id };
}

export async function updateStaff(
  locale: string,
  staffId: string,
  input: StaffInput,
): Promise<StaffActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({
      name: input.name.trim(),
      title: input.title.trim() || null,
      color: input.color || null,
      avatar_url: input.avatarUrl.trim() || null,
      is_bookable: input.isBookable,
    })
    .eq("id", staffId);

  if (error) return { ok: false, error: "save_failed" };

  const svcErr = await syncServices(supabase, staffId, input.serviceIds);
  if (svcErr) return { ok: false, error: svcErr };

  revalidatePath(`/${safeLocale}/dashboard/staff`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true, id: staffId };
}

export async function toggleStaffActive(
  locale: string,
  staffId: string,
  isActive: boolean,
): Promise<StaffActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ is_active: isActive })
    .eq("id", staffId);

  if (error) return { ok: false, error: "save_failed" };
  revalidatePath(`/${safeLocale}/dashboard/staff`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}

export async function deleteStaff(
  locale: string,
  staffId: string,
): Promise<StaffActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", staffId);

  if (error) return { ok: false, error: "save_failed" };
  revalidatePath(`/${safeLocale}/dashboard/staff`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}
