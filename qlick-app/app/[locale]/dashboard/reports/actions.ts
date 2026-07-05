"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ownerBusiness() {
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return { supabase, businessId: null as string | null };
  }
  return { supabase, businessId: biz.id as string };
}

/** Flags a customer account to the Qlick platform for review. */
export async function reportAccount(
  locale: string,
  customerId: string,
  customerName: string,
  reason: string,
): Promise<ActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await ownerBusiness();
  if (!businessId) return { ok: false, error: "no_permission" };

  const { error } = await supabase.from("account_reports").insert({
    business_id: businessId,
    reported_customer_id: customerId,
    customer_name: customerName || null,
    reason: reason.trim() || null,
  });
  if (error) return { ok: false, error: "report_failed" };

  revalidatePath(`/${safeLocale}/dashboard/reports`);
  return { ok: true };
}

/**
 * Blocks a customer from making NEW bookings at this business.
 * `cancelFuture` also cancels their upcoming bookings here.
 */
export async function blockCustomer(
  locale: string,
  customerId: string,
  cancelFuture: boolean,
  reason?: string,
): Promise<ActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await ownerBusiness();
  if (!businessId) return { ok: false, error: "no_permission" };

  const { error } = await supabase
    .from("business_blocked_customers")
    .upsert(
      { business_id: businessId, customer_id: customerId, reason: reason?.trim() || null },
      { onConflict: "business_id,customer_id" },
    );
  if (error) return { ok: false, error: "block_failed" };

  if (cancelFuture) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_by: "business" })
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .in("status", ["pending", "confirmed"])
      .gt("starts_at", new Date().toISOString());
  }

  revalidatePath(`/${safeLocale}/dashboard/reports`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  return { ok: true };
}

/** Removes a customer's block. */
export async function unblockCustomer(
  locale: string,
  customerId: string,
): Promise<ActionResult> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await ownerBusiness();
  if (!businessId) return { ok: false, error: "no_permission" };

  const { error } = await supabase
    .from("business_blocked_customers")
    .delete()
    .eq("business_id", businessId)
    .eq("customer_id", customerId);
  if (error) return { ok: false, error: "unblock_failed" };

  revalidatePath(`/${safeLocale}/dashboard/reports`);
  return { ok: true };
}
