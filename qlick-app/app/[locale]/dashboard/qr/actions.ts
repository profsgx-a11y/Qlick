"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import type { Json } from "@/lib/supabase/types";

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/**
 * Upserts the business's default QR poster design.
 */
export async function saveTemplate(
  locale: string,
  config: Record<string, unknown>,
): Promise<SaveResult> {
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

  const { data: existing } = await supabase
    .from("qr_templates")
    .select("id")
    .eq("business_id", biz.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("qr_templates")
      .update({ config: config as Json })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "save_failed" };
  } else {
    const { error } = await supabase.from("qr_templates").insert({
      business_id: biz.id,
      name: "QR Poster",
      config: config as Json,
      is_default: true,
    });
    if (error) return { ok: false, error: "save_failed" };
  }

  revalidatePath(`/${safeLocale}/dashboard/qr`);
  return { ok: true };
}
