"use server";

import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; error?: string };

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, ok: Boolean(profile?.is_admin) };
}

export async function changeAdminPassword(newPassword: string): Promise<Res> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "password_short" };
  }
  const { supabase, ok } = await ensureAdmin();
  if (!ok) return { ok: false, error: "not_admin" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}

export async function changeAdminEmail(newEmail: string): Promise<Res> {
  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || !email.includes(".")) {
    return { ok: false, error: "email_invalid" };
  }
  const { supabase, ok } = await ensureAdmin();
  if (!ok) return { ok: false, error: "not_admin" };
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}
