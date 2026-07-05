import type { SupabaseClient } from "@supabase/supabase-js";

/** Limits enforced on the free (trial) plan. Paid plans are unlimited. */
export const FREE_LIMITS = {
  staff: 3,
  services: 3,
} as const;

export interface PlanState {
  plan: "free" | "monthly" | "yearly";
  /** Effective expiry: trial end (free) or subscription end (paid). */
  expiresAt: string | null;
  /** May the business take online bookings, plan-wise? */
  active: boolean;
  /** Whole days until expiry (negative = expired, null = no expiry yet). */
  daysLeft: number | null;
}

/**
 * Reads the plan state from the DB (business_plan_state), the same source of
 * truth create_booking uses to lock expired businesses.
 */
export async function getPlanState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  businessId: string,
): Promise<PlanState> {
  const { data } = await supabase.rpc("business_plan_state", {
    p_business_id: businessId,
  });
  const raw = (data ?? {}) as {
    plan?: string;
    expires_at?: string | null;
    active?: boolean;
  };
  const plan = (raw.plan ?? "free") as PlanState["plan"];
  const expiresAt = raw.expires_at ?? null;
  const daysLeft = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
    : null;
  return {
    plan,
    expiresAt,
    // If the RPC ever fails, err on the side of keeping the business open.
    active: raw.active ?? true,
    daysLeft,
  };
}
