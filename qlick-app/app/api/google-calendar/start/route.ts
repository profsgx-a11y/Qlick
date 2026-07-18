import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { gcalConfigured, googleAuthUrl, siteUrl } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gcal_oauth";

function localeFrom(request: NextRequest): string {
  return request.cookies.get("NEXT_LOCALE")?.value === "en" ? "en" : "el";
}

function settingsUrl(locale: string, flag: string): URL {
  return new URL(
    `/${locale}/dashboard/settings?gcal=${flag}#google-calendar`,
    siteUrl(),
  );
}

/**
 * Kicks off the Google OAuth flow for the signed-in owner/manager.
 * The state nonce + business id travel in a short-lived httpOnly cookie
 * and are verified again in the callback.
 */
export async function GET(request: NextRequest) {
  const locale = localeFrom(request);

  if (!gcalConfigured()) {
    return NextResponse.redirect(settingsUrl(locale, "not_configured"));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, siteUrl()));
  }

  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return NextResponse.redirect(settingsUrl(locale, "err_permission"));
  }

  const nonce = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(googleAuthUrl(nonce));
  response.cookies.set(
    STATE_COOKIE,
    JSON.stringify({ n: nonce, b: biz.id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/google-calendar",
    },
  );
  return response;
}
