"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHome } from "@/lib/auth";

export interface LoginResult {
  error?: string;
}

export async function loginAction(
  locale: string,
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Συμπλήρωσε email και κωδικό." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(await userHome(supabase, locale, data.user.id));
}
